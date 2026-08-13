#!/usr/bin/env tsx
/**
 * Retires the pre-Obsidian-Flux brand colour defaults.
 *
 * The Setting rows `primary_color` / `secondary_color` feed --ob-primary and
 * --ob-primary-hover (see src/app/layout.tsx). Installations seeded before the
 * redesign hold `#1e40af` / `#0f172a`, which render the whole platform in a
 * generic indigo rather than the design system's electric blue.
 *
 * Only rows still holding the *exact* retired default are rewritten — an
 * academy that deliberately chose a colour in Branding keeps it. Safe to
 * re-run; it is a no-op once migrated.
 *
 *   npx tsx scripts/migrate-brand-colors.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";

// Mirrors the driver selection in src/lib/db.ts — Neon's serverless driver
// cannot reach a plain local Postgres.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");
const isLocal = /^postgres(ql)?:\/\/[^/@]*@?(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
const db = new PrismaClient({
  adapter: isLocal ? new PrismaPg({ connectionString: url }) : new PrismaNeon({ connectionString: url }),
});

/** key -> [retired default, Obsidian Flux replacement] */
const RETIRED: Record<string, [string, string]> = {
  primary_color: ["#1e40af", "#0070f3"],
  secondary_color: ["#0f172a", "#0059c5"],
  // The dark surfaces the pre-Obsidian palette wrote. These feed
  // --ob-surface-base / --ob-surface-low, so an install still carrying them
  // renders on #101010/#202020 instead of the designed #131313/#1c1b1b.
  dark_bg_color: ["#101010", "#131313"],
  card_dark_color: ["#202020", "#1c1b1b"],
};

/** Further superseded values for the same keys, from earlier palettes. */
const ALSO_RETIRED: Record<string, string[]> = {
  primary_color: ["#a02020"],
  secondary_color: ["#903030"],
  dark_bg_color: ["#0a0a0a"],
  card_dark_color: ["#1a1a1a"],
};

/** Keys that should exist at the Obsidian default when absent entirely. */
const NEW_DEFAULTS: [string, string][] = [
  ["dark_bg_color", "#131313"],
  ["card_dark_color", "#1c1b1b"],
];

async function main() {
  const keys = [...Object.keys(RETIRED), ...NEW_DEFAULTS.map(([k]) => k)];
  const before = await db.setting.findMany({ where: { key: { in: keys } } });
  console.log("BEFORE:", before.map((s) => `${s.key}=${s.value}`).join("  ") || "(none)");

  for (const [key, [retired, replacement]] of Object.entries(RETIRED)) {
    const row = before.find((s) => s.key === key);
    if (!row) {
      await db.setting.create({ data: { key, value: replacement } });
      console.log(`  created   ${key} = ${replacement}`);
      continue;
    }
    const current = row.value.toLowerCase();
    const isRetired = current === retired || (ALSO_RETIRED[key] ?? []).includes(current);
    if (isRetired) {
      await db.setting.update({ where: { key }, data: { value: replacement } });
      console.log(`  updated   ${key}  ${row.value} -> ${replacement}`);
    } else {
      console.log(`  preserved ${key}  ${row.value}  (customised)`);
    }
  }

  for (const [key, value] of NEW_DEFAULTS) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  const after = await db.setting.findMany({ where: { key: { in: keys } } });
  console.log("AFTER: ", after.map((s) => `${s.key}=${s.value}`).join("  "));
}

main()
  .catch((e) => {
    console.error("FAILED:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
