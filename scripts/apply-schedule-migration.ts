#!/usr/bin/env tsx
/**
 * Apply the location-scoped schedule migration before `prisma db push` runs.
 *
 * Why this exists
 * ---------------
 * This project deploys with `prisma db push` (see the build script in
 * package.json), which reconciles the database to schema.prisma but never runs
 * anything in prisma/migrations. That is fine for additive, nullable columns —
 * and it is exactly why the earlier migrations here are documentation only.
 *
 * It is not fine for `programme_schedules.stationId`, which is REQUIRED. Against
 * a populated database `db push` refuses outright:
 *
 *     ⚠️ We found changes that cannot be executed:
 *       • Added the required column `stationId` to the `programme_schedules`
 *         table without a default value. There are N rows in this table, it is
 *         not possible to execute this step.
 *     You may use the --force-reset flag to drop the database before push
 *     All data will be lost.
 *
 * So a deploy would fail, and the remedy Prisma suggests would destroy the
 * production database. The missing piece is the backfill: add the column
 * nullable, populate it from the old `venueId` (falling back to the default
 * location), and only then tighten it to NOT NULL. migration.sql already does
 * precisely that, so this script runs it first and `db push` then finds nothing
 * left to change.
 *
 * Running it on an already-migrated database is a no-op: migration.sql is
 * idempotent throughout (IF NOT EXISTS / existence-checked constraints), which
 * is what makes it safe on every deploy.
 *
 *   npm run db:migrate:schedule
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

const MIGRATION_SQL = path.join(
  __dirname,
  "..",
  "prisma",
  "migrations",
  "20260823000001_location_scoped_schedules",
  "migration.sql",
);

/**
 * Mirrors isLocalPostgresUrl() in src/lib/db.ts. Deliberately re-inlined rather
 * than imported: that module instantiates a PrismaClient at import time, which
 * this script must not do — it has to run *before* the schema is in sync.
 */
function isLocalPostgresUrl(url: string): boolean {
  return /^postgres(ql)?:\/\/[^/@]*@?(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set — cannot apply the schedule migration.");
    process.exit(1);
  }

  const sql = readFileSync(MIGRATION_SQL, "utf-8");

  // Neon (and any non-local endpoint) needs TLS. The app itself talks to Neon
  // over its WebSocket driver, but that driver cannot execute raw DDL scripts,
  // so this uses a plain TCP connection with node-postgres.
  const client = new Client({
    connectionString,
    ...(isLocalPostgresUrl(connectionString) ? {} : { ssl: { rejectUnauthorized: false } }),
  });

  await client.connect();
  try {
    // One simple-query call runs the whole file in a single implicit
    // transaction, so a failure part-way leaves nothing half-applied. It also
    // keeps the DO $$ … $$ blocks intact, which naive splitting on ";" would
    // tear apart.
    await client.query(sql);
    console.log("✅ Schedule migration applied (idempotent — no-op if already present)");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("❌ Schedule migration failed:", error);
  process.exit(1);
});
