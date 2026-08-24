/**
 * One-off rebrand: move the showcase website's stored colours from the old
 * navy/sky-blue palette to the crest palette (ink + crimson) sampled from the
 * club logo.
 *
 * The token defaults live in code (tokens.css / ThemeVars.tsx / settings.ts),
 * but header/footer chrome, pathway levels and programme category tags are
 * stored per-row in the database and were seeded with the old hexes — this
 * script rewrites those rows.
 *
 * Idempotent, and deliberately conservative: it only touches values that still
 * hold an exact legacy hex, so any colour an admin has since chosen by hand is
 * left alone. Safe to re-run.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { isLocalPostgresUrl } from "../src/lib/db";

dotenv.config();

// Same driver selection as src/lib/db.ts and prisma/seed.ts.
const connectionString = process.env.DATABASE_URL!;
const db = new PrismaClient({
  adapter: isLocalPostgresUrl(connectionString) ? new PrismaPg({ connectionString }) : new PrismaNeon({ connectionString }),
});

// legacy hex -> crest replacement
const MAP: Record<string, string> = {
  "#001F49": "#1B1315", // navy 900   -> ink
  "#002B5C": "#3B1E22", // navy 800   -> deep wine
  "#43C7ED": "#C0453F", // sky        -> bright crimson
  "#3996D6": "#A32F33", // heading blue -> crest crimson
  "#EEF5FC": "#F8F2F2",
  "#071E41": "#1F1719",
  "#5E6D82": "#6E6164",
  "#DCE6F1": "#E8DDDD",
};

// The footer sits on ink and its column headings are 14px, so it needs a
// lighter accent than the crest crimson to clear 4.5:1 (#C0453F only reaches
// 3.6:1 there). Includes #C0453F itself so a row rebranded by an earlier run
// of this script is corrected too.
const FOOTER_ACCENT: Record<string, string> = {
  "#43C7ED": "#D9645E",
  "#C0453F": "#D9645E",
};

const remap = (v: string | null | undefined) => (v ? MAP[v.toUpperCase()] ?? null : null);
const remapFooterAccent = (v: string | null | undefined) => (v ? FOOTER_ACCENT[v.toUpperCase()] ?? null : null);

async function main() {
  let changed = 0;

  for (const header of await db.websiteHeaderConfig.findMany()) {
    const data: Record<string, string> = {};
    for (const f of ["backgroundColor", "textColor", "accentColor"] as const) {
      const next = remap(header[f]);
      if (next) data[f] = next;
    }
    // A white header keeps its white background; only its ink/accent move.
    if (Object.keys(data).length) {
      await db.websiteHeaderConfig.update({ where: { id: header.id }, data });
      changed++;
    }
  }

  for (const footer of await db.websiteFooterConfig.findMany()) {
    const data: Record<string, string> = {};
    for (const f of ["backgroundColor", "textColor"] as const) {
      const next = remap(footer[f]);
      if (next) data[f] = next;
    }
    const accent = remapFooterAccent(footer.accentColor);
    if (accent) data.accentColor = accent;
    if (Object.keys(data).length) {
      await db.websiteFooterConfig.update({ where: { id: footer.id }, data });
      changed++;
    }
  }

  for (const level of await db.pathwayLevel.findMany()) {
    const next = remap(level.color);
    if (next) {
      await db.pathwayLevel.update({ where: { id: level.id }, data: { color: next } });
      changed++;
    }
  }

  for (const cat of await db.programmeCategory.findMany()) {
    const next = remap(cat.colorTag);
    if (next) {
      await db.programmeCategory.update({ where: { id: cat.id }, data: { colorTag: next } });
      changed++;
    }
  }

  // Any Setting rows an admin saved from the old Showcase Website theme editor.
  for (const setting of await db.setting.findMany({ where: { key: { startsWith: "website_color_" } } })) {
    const next = remap(setting.value);
    if (next) {
      await db.setting.update({ where: { key: setting.key }, data: { value: next } });
      changed++;
    }
  }

  console.log(changed === 0 ? "✅ Nothing to rebrand — already on the crest palette." : `✅ Rebranded ${changed} row(s) to the crest palette.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
