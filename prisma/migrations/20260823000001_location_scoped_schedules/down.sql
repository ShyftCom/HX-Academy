-- Reverse of migration.sql — restores programme-owned schedules with an optional venue.
--
-- Prisma has no native `migrate down`, so this is applied by hand:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260823000001_location_scoped_schedules/down.sql
-- then revert schema.prisma and run `prisma db push` / `prisma generate`.
--
-- Idempotent, like the up migration. Lossy in exactly one direction, by necessity: slots
-- created after the migration with no programme (programmeId IS NULL) cannot exist under the
-- old NOT NULL model. They are deleted, and the count is reported first — inspect it before
-- committing to the rollback.

DO $$
DECLARE orphans BIGINT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'programme_schedules' AND column_name = 'programmeId'
    ) THEN
        SELECT count(*) INTO orphans FROM "programme_schedules" WHERE "programmeId" IS NULL;
        IF orphans > 0 THEN
            RAISE WARNING 'Rollback will DELETE % programme-less slot(s) — the old model cannot represent them.', orphans;
        END IF;
    END IF;
END $$;

-- ==================== Drop conflict rules ====================
DROP TRIGGER IF EXISTS "programme_schedules_overlap_guard_trg" ON "programme_schedules";
DROP FUNCTION IF EXISTS "programme_schedules_overlap_guard"();
ALTER TABLE "programme_schedules" DROP CONSTRAINT IF EXISTS "programme_schedules_no_overlap";
ALTER TABLE "programme_schedules" DROP CONSTRAINT IF EXISTS "programme_schedules_time_order_check";
-- btree_gist is deliberately left installed: other objects may since have come to depend on
-- it, and an unused extension costs nothing.

-- ==================== Restore venueId from stationId ====================
ALTER TABLE "programme_schedules" ADD COLUMN IF NOT EXISTS "venueId" TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'programme_schedules' AND column_name = 'stationId'
    ) THEN
        EXECUTE 'UPDATE "programme_schedules" SET "venueId" = "stationId" WHERE "venueId" IS NULL';
    END IF;
END $$;

DO $$ BEGIN
    ALTER TABLE "programme_schedules" ADD CONSTRAINT "programme_schedules_venueId_fkey"
        FOREIGN KEY ("venueId") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==================== Restore programmeId NOT NULL ====================
DELETE FROM "programme_schedules" WHERE "programmeId" IS NULL;
ALTER TABLE "programme_schedules" ALTER COLUMN "programmeId" SET NOT NULL;

-- ==================== Drop the location-scoped columns and indexes ====================
DROP INDEX IF EXISTS "programme_schedules_stationId_dayOfWeek_idx";
DROP INDEX IF EXISTS "programme_schedules_stationId_idx";
ALTER TABLE "programme_schedules" DROP CONSTRAINT IF EXISTS "programme_schedules_stationId_fkey";
ALTER TABLE "programme_schedules" DROP COLUMN IF EXISTS "stationId";
ALTER TABLE "programme_schedules" DROP COLUMN IF EXISTS "dayOfWeek";
ALTER TABLE "programme_schedules" DROP COLUMN IF EXISTS "startMinutes";
ALTER TABLE "programme_schedules" DROP COLUMN IF EXISTS "endMinutes";
ALTER TABLE "programme_schedules" DROP COLUMN IF EXISTS "field";

-- ==================== Drop the schedule header table ====================
DROP TABLE IF EXISTS "location_schedules";
