/**
 * Lists public-site database rows that are missing French or Arabic.
 *
 * The public site falls back ar -> fr -> base, and the base column holds
 * English. So any row missing its Fr/Ar variant renders English (or French on
 * the Arabic page). This script reports exactly which records an editor needs
 * to open in Super Admin -> Showcase Website.
 *
 *   npx tsx scripts/audit-untranslated.ts
 */
import dotenv from "dotenv";
dotenv.config();

// Imported inside main(), not at the top: ES module imports are hoisted, so a
// static `import { db }` would evaluate src/lib/db.ts — and read DATABASE_URL
// — before dotenv.config() had a chance to run.

type Row = { table: string; id: string; field: string; missing: string; value: string };

const rows: Row[] = [];

function check(table: string, id: string, base: string, field: string, fr: unknown, ar: unknown) {
  if (!base) return;
  const short = base.length > 60 ? base.slice(0, 57) + "…" : base;
  if (!fr) rows.push({ table, id, field, missing: "fr", value: short });
  if (!ar) rows.push({ table, id, field, missing: "ar", value: short });
}

async function main() {
  const { db } = await import("@/lib/db");

  for (const r of await db.headerNavItem.findMany()) check("HeaderNavItem", r.id, r.label, "label", r.labelFr, r.labelAr);
  for (const r of await db.headerNavDropdownItem.findMany()) {
    check("HeaderNavDropdownItem", r.id, r.label, "label", r.labelFr, r.labelAr);
    check("HeaderNavDropdownItem", r.id, r.description ?? "", "description", r.descriptionFr, r.descriptionAr);
  }
  for (const r of await db.footerLink.findMany()) check("FooterLink", r.id, r.label, "label", r.labelFr, r.labelAr);
  for (const r of await db.footerLinkColumn.findMany()) check("FooterLinkColumn", r.id, r.title, "title", r.titleFr, r.titleAr);
  for (const r of await db.footerBottomLink.findMany()) check("FooterBottomLink", r.id, r.label, "label", r.labelFr, r.labelAr);
  for (const r of await db.websiteFooterConfig.findMany()) check("WebsiteFooterConfig", r.id, r.tagline ?? "", "tagline", r.taglineFr, r.taglineAr);
  for (const r of await db.websiteHeaderConfig.findMany()) check("WebsiteHeaderConfig", r.id, r.ctaLabel ?? "", "ctaLabel", r.ctaLabelFr, r.ctaLabelAr);
  for (const r of await db.programme.findMany()) {
    check("Programme", r.slug, r.name, "name", r.nameFr, r.nameAr);
    check("Programme", r.slug, r.shortDescription ?? "", "shortDescription", r.shortDescriptionFr, r.shortDescriptionAr);
    check("Programme", r.slug, r.fullDescription ?? "", "fullDescription", r.fullDescriptionFr, r.fullDescriptionAr);
  }
  for (const r of await db.faq.findMany()) {
    check("Faq", r.id, r.question, "question", r.questionFr, r.questionAr);
    check("Faq", r.id, r.answer, "answer", r.answerFr, r.answerAr);
  }
  for (const r of await db.pathwayLevel.findMany()) {
    check("PathwayLevel", r.id, r.name, "name", r.nameFr, r.nameAr);
    check("PathwayLevel", r.id, r.description ?? "", "description", r.descriptionFr, r.descriptionAr);
  }
  for (const r of await db.newsArticle.findMany()) {
    check("NewsArticle", r.slug, r.title, "title", r.titleFr, r.titleAr);
    check("NewsArticle", r.slug, r.excerpt ?? "", "excerpt", r.excerptFr, r.excerptAr);
  }
  for (const r of await db.coach.findMany()) check("Coach", r.id, r.role ?? "", "role", r.roleFr, r.roleAr);
  for (const r of await db.station.findMany()) check("Station", r.slug ?? r.id, r.shortDescription ?? "", "shortDescription", r.shortDescriptionFr, r.shortDescriptionAr);
  for (const r of await db.websiteSlide.findMany()) {
    check("WebsiteSlide", r.id, r.title ?? "", "title", r.titleFr, r.titleAr);
    check("WebsiteSlide", r.id, r.subtitle ?? "", "subtitle", r.subtitleFr, r.subtitleAr);
  }
  for (const r of await db.programmeCategory.findMany()) check("ProgrammeCategory", r.slug, r.name, "name", r.nameFr, r.nameAr);
  for (const r of await db.newsCategory.findMany()) check("NewsCategory", r.slug, r.name, "name", r.nameFr, r.nameAr);

  // LandingSection.content is a JSON blob using the same base/Fr/Ar convention.
  for (const s of await db.landingSection.findMany({ include: { landingPage: true } })) {
    let content: Record<string, unknown>;
    try { content = JSON.parse(s.content); } catch { continue; }
    for (const key of Object.keys(content)) {
      if (key.endsWith("Fr") || key.endsWith("Ar")) continue;
      const val = content[key];
      if (typeof val !== "string" || !val.trim()) continue;
      if (!["heading", "subheading", "body", "html", "ctaLabel", "secondaryCtaLabel", "eyebrow"].includes(key)) continue;
      check(`LandingSection(${s.landingPage?.slug ?? "?"}/${s.type})`, s.id.slice(0, 8), val, key, content[`${key}Fr`], content[`${key}Ar`]);
    }
  }

  // These gained per-locale columns in the
  // 20260823000002_public_content_locale_columns migration, so they are checked
  // like everything else now rather than listed as a known schema gap.
  for (const r of await db.landingPage.findMany()) {
    check("LandingPage", r.slug ?? r.id, r.metaTitle ?? "", "metaTitle", r.metaTitleFr, r.metaTitleAr);
    check("LandingPage", r.slug ?? r.id, r.metaDescription ?? "", "metaDescription", r.metaDescriptionFr, r.metaDescriptionAr);
    check("LandingPage", r.slug ?? r.id, r.breadcrumbLabel ?? "", "breadcrumbLabel", r.breadcrumbLabelFr, r.breadcrumbLabelAr);
  }
  for (const r of await db.subscriptionPlan.findMany()) {
    check("SubscriptionPlan", r.name, r.name, "name", r.nameFr, r.nameAr);
    check("SubscriptionPlan", r.name, r.description ?? "", "description", r.descriptionFr, r.descriptionAr);
  }
  for (const r of await db.product.findMany()) {
    check("Product", r.slug ?? r.id, r.name, "name", r.nameFr, r.nameAr);
    check("Product", r.slug ?? r.id, r.description ?? "", "description", r.descriptionFr, r.descriptionAr);
  }
  for (const r of await db.formField.findMany()) {
    check("FormField", r.fieldName, r.label, "label", r.labelFr, r.labelAr);
    check("FormField", r.fieldName, r.placeholder ?? "", "placeholder", r.placeholderFr, r.placeholderAr);
  }
  for (const r of await db.fileRequirement.findMany()) {
    check("FileRequirement", r.id.slice(0, 6), r.title, "title", r.titleFr, r.titleAr);
    check("FileRequirement", r.id.slice(0, 6), r.description ?? "", "description", r.descriptionFr, r.descriptionAr);
  }
  for (const r of await db.summerCampPlan.findMany()) {
    check("SummerCampPlan", r.name, r.name, "name", r.nameFr, r.nameAr);
    check("SummerCampPlan", r.name, r.description ?? "", "description", r.descriptionFr, r.descriptionAr);
  }
  for (const r of await db.summerCampSession.findMany()) {
    check("SummerCampSession", r.name, r.name, "name", r.nameFr, r.nameAr);
    check("SummerCampSession", r.name, r.description ?? "", "description", r.descriptionFr, r.descriptionAr);
  }
  for (const r of await db.websiteFooterConfig.findMany()) {
    check("WebsiteFooterConfig", r.id.slice(0, 6), r.copyrightText, "copyrightText", r.copyrightTextFr, r.copyrightTextAr);
  }

  const byTable = new Map<string, Row[]>();
  for (const r of rows) {
    if (!byTable.has(r.table)) byTable.set(r.table, []);
    byTable.get(r.table)!.push(r);
  }

  console.log(`\n=== Rows missing a translation (${rows.length}) ===`);
  for (const [table, list] of [...byTable.entries()].sort()) {
    console.log(`\n${table}  (${list.length})`);
    for (const r of list.slice(0, 12)) console.log(`   [${r.missing}] ${r.field}: ${r.value}`);
    if (list.length > 12) console.log(`   … and ${list.length - 12} more`);
  }

  console.log(
    rows.length === 0
      ? "\nEvery public-facing field has both translations."
      : "\nFill these in Super Admin, or extend scripts/backfill-translations.ts."
  );

  await db.$disconnect();
}

main();
