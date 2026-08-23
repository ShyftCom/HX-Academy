import type { PrismaClient } from "@prisma/client";

/**
 * The two schedule rules `prisma db push` cannot express.
 *
 * This project deploys with `prisma db push` (see the build script in
 * package.json), which applies the end state described by schema.prisma —
 * columns, indexes and foreign keys, but not CHECK or EXCLUDE constraints.
 * Without this, a deploy that never ran the SQL migration would ship a schedule
 * with no double-booking protection at all.
 *
 * So the seed calls this on every deploy. The statements are the same ones in
 * prisma/migrations/20260823000001_location_scoped_schedules/migration.sql and
 * are idempotent, so running both is harmless.
 */
const STATEMENTS: string[] = [
  // endMinutes must come after startMinutes.
  `DO $$ BEGIN
      ALTER TABLE "programme_schedules" ADD CONSTRAINT "programme_schedules_time_order_check"
          CHECK ("startMinutes" IS NULL OR "endMinutes" IS NULL OR "endMinutes" > "startMinutes");
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

  `DO $$
  BEGIN
      CREATE EXTENSION IF NOT EXISTS btree_gist;
  EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not create extension btree_gist (%). Falling back to a trigger-based overlap guard.', SQLERRM;
  END $$;`,

  // No two ACTIVE slots in the same location may overlap on the same day on the
  // same pitch. Scoped to rows that name a pitch — see the migration for why.
  `DO $$
  BEGIN
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
  END $$;`,

  `CREATE OR REPLACE FUNCTION "programme_schedules_overlap_guard"() RETURNS trigger AS $fn$
  BEGIN
      IF NEW."isActive" AND NEW."field" <> '' AND NEW."dayOfWeek" IS NOT NULL
         AND NEW."startMinutes" IS NOT NULL AND NEW."endMinutes" IS NOT NULL
         AND EXISTS (
             SELECT 1 FROM "programme_schedules" x
             WHERE x."id" <> NEW."id" AND x."isActive"
               AND x."stationId" = NEW."stationId" AND x."field" = NEW."field" AND x."dayOfWeek" = NEW."dayOfWeek"
               AND x."startMinutes" < NEW."endMinutes" AND x."endMinutes" > NEW."startMinutes"
         )
      THEN
          RAISE EXCEPTION 'schedule slot overlaps an existing slot in the same location, day and pitch'
              USING ERRCODE = '23P01';
      END IF;
      RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql;`,

  // Only attach the trigger where the exclusion constraint could not be created,
  // so the two never both fire.
  `DO $$
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
  END $$;`,
];

export async function ensureScheduleConstraints(db: PrismaClient): Promise<void> {
  for (const statement of STATEMENTS) {
    await db.$executeRawUnsafe(statement);
  }
}
