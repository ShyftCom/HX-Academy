-- Per-locale columns for the public site's remaining single-language fields.
--
-- The showcase site is French/Arabic. Most editable content already followed
-- the field / fieldFr / fieldAr convention, but these eight tables did not, so
-- one stored value had to serve both locales — an Arabic visitor saw French
-- plan names, French form labels and a French footer copyright line.
--
-- Purely additive: every column is nullable TEXT with no default and no
-- backfill, so existing rows are untouched and existing reads keep working.
-- The base column stays the fallback (see src/components/website/sections/
-- localeField.ts), which means nothing breaks before the new columns are
-- filled in.
--
-- IF NOT EXISTS throughout so this is safe to re-run, and safe on a database
-- that has already been brought forward with `prisma db push`.

-- Landing pages: SEO metadata and the breadcrumb label are all rendered publicly.
ALTER TABLE "landing_pages" ADD COLUMN IF NOT EXISTS "metaTitleFr"        TEXT;
ALTER TABLE "landing_pages" ADD COLUMN IF NOT EXISTS "metaTitleAr"        TEXT;
ALTER TABLE "landing_pages" ADD COLUMN IF NOT EXISTS "metaDescriptionFr"  TEXT;
ALTER TABLE "landing_pages" ADD COLUMN IF NOT EXISTS "metaDescriptionAr"  TEXT;
ALTER TABLE "landing_pages" ADD COLUMN IF NOT EXISTS "breadcrumbLabelFr"  TEXT;
ALTER TABLE "landing_pages" ADD COLUMN IF NOT EXISTS "breadcrumbLabelAr"  TEXT;

-- Subscription plans appear in the public pricing cards.
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "nameFr"        TEXT;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "nameAr"        TEXT;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "descriptionFr" TEXT;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "descriptionAr" TEXT;

-- Store listings and product detail pages.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "nameFr"        TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "nameAr"        TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "descriptionFr" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "descriptionAr" TEXT;

-- Admin-built checkout/application form fields.
ALTER TABLE "form_fields" ADD COLUMN IF NOT EXISTS "labelFr"       TEXT;
ALTER TABLE "form_fields" ADD COLUMN IF NOT EXISTS "labelAr"       TEXT;
ALTER TABLE "form_fields" ADD COLUMN IF NOT EXISTS "placeholderFr" TEXT;
ALTER TABLE "form_fields" ADD COLUMN IF NOT EXISTS "placeholderAr" TEXT;

-- Document requirements shown in the apply and summer-camp wizards.
ALTER TABLE "file_requirements" ADD COLUMN IF NOT EXISTS "titleFr"       TEXT;
ALTER TABLE "file_requirements" ADD COLUMN IF NOT EXISTS "titleAr"       TEXT;
ALTER TABLE "file_requirements" ADD COLUMN IF NOT EXISTS "descriptionFr" TEXT;
ALTER TABLE "file_requirements" ADD COLUMN IF NOT EXISTS "descriptionAr" TEXT;

-- Summer camp plans and sessions, both public-facing in the registration flow.
ALTER TABLE "summer_camp_plans" ADD COLUMN IF NOT EXISTS "nameFr"        TEXT;
ALTER TABLE "summer_camp_plans" ADD COLUMN IF NOT EXISTS "nameAr"        TEXT;
ALTER TABLE "summer_camp_plans" ADD COLUMN IF NOT EXISTS "descriptionFr" TEXT;
ALTER TABLE "summer_camp_plans" ADD COLUMN IF NOT EXISTS "descriptionAr" TEXT;

ALTER TABLE "summer_camp_sessions" ADD COLUMN IF NOT EXISTS "nameFr"        TEXT;
ALTER TABLE "summer_camp_sessions" ADD COLUMN IF NOT EXISTS "nameAr"        TEXT;
ALTER TABLE "summer_camp_sessions" ADD COLUMN IF NOT EXISTS "descriptionFr" TEXT;
ALTER TABLE "summer_camp_sessions" ADD COLUMN IF NOT EXISTS "descriptionAr" TEXT;

-- Footer copyright line.
ALTER TABLE "website_footer_configs" ADD COLUMN IF NOT EXISTS "copyrightTextFr" TEXT;
ALTER TABLE "website_footer_configs" ADD COLUMN IF NOT EXISTS "copyrightTextAr" TEXT;
