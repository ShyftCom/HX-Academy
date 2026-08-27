-- Location-scoped schedules: the schema change, plus the backfill that makes it
-- applicable to a database that already has rows.
--
-- Before: a schedule row belonged to a *programme* (programme_schedules.programmeId,
-- NOT NULL) and only *mentioned* a location through a nullable venueId.
-- After: a slot belongs to a *location* (stationId, NOT NULL, ON DELETE CASCADE) and
-- the programme link is optional metadata. Each station also gets a location_schedules
-- header row.
--
-- WHY THIS LIVES IN scripts/ AND NOT prisma/migrations/
-- ----------------------------------------------------
-- It is not a Prisma migration. This project deploys with `prisma db push`, which
-- never runs prisma/migrations at all — so this file is executed directly by
-- scripts/apply-schedule-migration.ts, which the build invokes before db push.
--
-- It used to live in prisma/migrations/20260823000001_location_scoped_schedules/,
-- where it looked like ordinary migration history and was duly deleted by a squash
-- to a 0_init baseline. That silently broke the build: the script read a path that
-- no longer existed and exited on ENOENT, and the deploy it exists to protect would
-- have failed at db push instead. Migration housekeeping is legitimate and will
-- happen again; the file that the build depends on therefore sits with the build
-- script that owns it, not in a directory managed by Prisma tooling.
--
-- A squashed 0_init baseline cannot replace this. It creates the final schema from
-- scratch, which is correct only for an empty database; production already has rows
-- in programme_schedules, and `stationId` is required. The backfill below — add the
-- column nullable, populate it from venueId (falling back to the default location),
-- only then tighten to NOT NULL — exists nowhere else in the repo.
--
-- Idempotent throughout, so it is safe to run on every deploy.
-- Reverse with scripts/schedule-migration-down.sql.

-- ==================== CreateTable: location_schedules ====================
CREATE TABLE IF NOT EXISTS "location_schedules" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "notes" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "location_schedules_stationId_key" ON "location_schedules"("stationId");

DO $$ BEGIN
    ALTER TABLE "location_schedules" ADD CONSTRAINT "location_schedules_stationId_fkey"
        FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-provision a header for every station that already exists. New stations get theirs
-- from ensureLocationSchedule() (src/lib/schedule.ts), called by POST /api/stations.
INSERT INTO "location_schedules" ("id", "stationId", "isPublished", "createdAt", "updatedAt")
SELECT 'ls_' || replace(gen_random_uuid()::text, '-', ''), s."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "stations" s
WHERE NOT EXISTS (SELECT 1 FROM "location_schedules" ls WHERE ls."stationId" = s."id");

-- ==================== AlterTable: programme_schedules (new columns) ====================
ALTER TABLE "programme_schedules" ADD COLUMN IF NOT EXISTS "stationId" TEXT;
ALTER TABLE "programme_schedules" ADD COLUMN IF NOT EXISTS "dayOfWeek" INTEGER;
ALTER TABLE "programme_schedules" ADD COLUMN IF NOT EXISTS "startMinutes" INTEGER;
ALTER TABLE "programme_schedules" ADD COLUMN IF NOT EXISTS "endMinutes" INTEGER;
ALTER TABLE "programme_schedules" ADD COLUMN IF NOT EXISTS "field" TEXT NOT NULL DEFAULT '';

-- ==================== Backfill: stationId ====================
-- A row that already named a venue keeps that venue. Guarded on the column still existing so
-- that a replay — after the DROP COLUMN further down — is a no-op rather than an error.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'programme_schedules' AND column_name = 'venueId'
    ) THEN
        EXECUTE 'UPDATE "programme_schedules" SET "stationId" = "venueId" WHERE "stationId" IS NULL AND "venueId" IS NOT NULL';
    END IF;
END $$;

-- A row that named no venue lands on the default location: lowest displayOrder, oldest first.
-- This is the "nothing is lost" step — the pre-existing global schedule stays visible,
-- attached to the default location.
UPDATE "programme_schedules"
SET "stationId" = (SELECT s."id" FROM "stations" s ORDER BY s."displayOrder" ASC, s."createdAt" ASC, s."id" ASC LIMIT 1)
WHERE "stationId" IS NULL;

-- Only tighten to NOT NULL once every row has a location. On a database with no stations at
-- all (nothing to attach to) the column stays nullable and the migration says so rather than
-- failing or inventing a location; re-run after creating one.
DO $$
DECLARE orphans BIGINT;
BEGIN
    SELECT count(*) INTO orphans FROM "programme_schedules" WHERE "stationId" IS NULL;
    IF orphans = 0 THEN
        ALTER TABLE "programme_schedules" ALTER COLUMN "stationId" SET NOT NULL;
    ELSE
        RAISE WARNING 'programme_schedules."stationId" left NULLABLE: % row(s) have no location because no station exists. Create a station and re-run this migration.', orphans;
    END IF;
END $$;

DO $$ BEGIN
    ALTER TABLE "programme_schedules" ADD CONSTRAINT "programme_schedules_stationId_fkey"
        FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==================== AlterTable: programmeId becomes optional ====================
-- A slot now belongs to a location; the programme is metadata. Repeating this is a no-op.
ALTER TABLE "programme_schedules" ALTER COLUMN "programmeId" DROP NOT NULL;

-- ==================== Backfill: typed day/time mirrors ====================
-- `day` is free text and always has been ("Monday", but also "Monday-Friday" in the seed
-- data). Anything that does not name exactly one weekday stays NULL: it is excluded from the
-- (stationId, dayOfWeek) index and from the overlap constraint, and the admin flags it for
-- review rather than guessing which day was meant.
UPDATE "programme_schedules"
SET "dayOfWeek" = CASE lower(btrim("day"))
    WHEN 'sunday'    THEN 0 WHEN 'dimanche' THEN 0 WHEN 'الأحد'    THEN 0
    WHEN 'monday'    THEN 1 WHEN 'lundi'    THEN 1 WHEN 'الإثنين'  THEN 1
    WHEN 'tuesday'   THEN 2 WHEN 'mardi'    THEN 2 WHEN 'الثلاثاء' THEN 2
    WHEN 'wednesday' THEN 3 WHEN 'mercredi' THEN 3 WHEN 'الأربعاء' THEN 3
    WHEN 'thursday'  THEN 4 WHEN 'jeudi'    THEN 4 WHEN 'الخميس'   THEN 4
    WHEN 'friday'    THEN 5 WHEN 'vendredi' THEN 5 WHEN 'الجمعة'   THEN 5
    WHEN 'saturday'  THEN 6 WHEN 'samedi'   THEN 6 WHEN 'السبت'    THEN 6
    ELSE NULL
END
WHERE "dayOfWeek" IS NULL AND "day" IS NOT NULL;

UPDATE "programme_schedules"
SET "startMinutes" = split_part("startTime", ':', 1)::int * 60 + split_part("startTime", ':', 2)::int
WHERE "startMinutes" IS NULL AND "startTime" ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$';

UPDATE "programme_schedules"
SET "endMinutes" = split_part("endTime", ':', 1)::int * 60 + split_part("endTime", ':', 2)::int
WHERE "endMinutes" IS NULL AND "endTime" ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$';

-- ==================== Indexes ====================
CREATE INDEX IF NOT EXISTS "programme_schedules_stationId_idx" ON "programme_schedules"("stationId");
CREATE INDEX IF NOT EXISTS "programme_schedules_stationId_dayOfWeek_idx" ON "programme_schedules"("stationId", "dayOfWeek");

-- ==================== DropColumn: venueId (superseded by stationId) ====================
ALTER TABLE "programme_schedules" DROP CONSTRAINT IF EXISTS "programme_schedules_venueId_fkey";
ALTER TABLE "programme_schedules" DROP COLUMN IF EXISTS "venueId";

-- ==================== Conflict rules ====================
DO $$ BEGIN
    ALTER TABLE "programme_schedules" ADD CONSTRAINT "programme_schedules_time_order_check"
        CHECK ("startMinutes" IS NULL OR "endMinutes" IS NULL OR "endMinutes" > "startMinutes");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No two ACTIVE slots in the same location may overlap on the same day on the same pitch.
--
-- The rule is scoped to rows that name a pitch (`field <> ''`). Two age groups training at
-- the same hour in the same location on *different* pitches is normal, and so is the same
-- thing with the pitch left blank — the existing seed data contains exactly that (U14 and
-- U16, both Thursday 18:30-19:45 at City Football Academy). Enforcing over blank pitches
-- would reject legitimate parallel sessions and would refuse to apply to live data. Fill in
-- the pitch and the double-booking becomes detectable.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS btree_gist;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not create extension btree_gist (%). Falling back to a trigger-based overlap guard.', SQLERRM;
END $$;

DO $$
BEGIN
    -- Existence-checked rather than EXCEPTION-guarded: an EXCLUDE constraint also creates an
    -- index of the same name, so a replay raises duplicate_table, not duplicate_object.
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist')
       AND NOT EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = 'programme_schedules_no_overlap' AND conrelid = '"programme_schedules"'::regclass
       )
    THEN
        ALTER TABLE "programme_schedules" ADD CONSTRAINT "programme_schedules_no_overlap"
            EXCLUDE USING gist (
                "stationId" WITH =,
                "field" WITH =,
                "dayOfWeek" WITH =,
                int4range("startMinutes", "endMinutes") WITH &&
            )
            WHERE ("isActive" AND "field" <> '' AND "dayOfWeek" IS NOT NULL AND "startMinutes" IS NOT NULL AND "endMinutes" IS NOT NULL);
    END IF;
END $$;

-- Fallback for a database where btree_gist is unavailable. The trigger is only attached when
-- the exclusion constraint could not be created, so the two never both fire.
CREATE OR REPLACE FUNCTION "programme_schedules_overlap_guard"() RETURNS trigger AS $fn$
BEGIN
    IF NEW."isActive" AND NEW."field" <> '' AND NEW."dayOfWeek" IS NOT NULL
       AND NEW."startMinutes" IS NOT NULL AND NEW."endMinutes" IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM "programme_schedules" x
           WHERE x."id" <> NEW."id"
             AND x."isActive"
             AND x."stationId" = NEW."stationId"
             AND x."field" = NEW."field"
             AND x."dayOfWeek" = NEW."dayOfWeek"
             AND x."startMinutes" < NEW."endMinutes"
             AND x."endMinutes" > NEW."startMinutes"
       )
    THEN
        RAISE EXCEPTION 'schedule slot overlaps an existing slot in the same location, day and pitch'
            USING ERRCODE = '23P01';
    END IF;
    RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'programme_schedules_no_overlap' AND conrelid = '"programme_schedules"'::regclass
    ) THEN
        DROP TRIGGER IF EXISTS "programme_schedules_overlap_guard_trg" ON "programme_schedules";
        CREATE TRIGGER "programme_schedules_overlap_guard_trg"
            BEFORE INSERT OR UPDATE ON "programme_schedules"
            FOR EACH ROW EXECUTE FUNCTION "programme_schedules_overlap_guard"();
    ELSE
        DROP TRIGGER IF EXISTS "programme_schedules_overlap_guard_trg" ON "programme_schedules";
    END IF;
END $$;
