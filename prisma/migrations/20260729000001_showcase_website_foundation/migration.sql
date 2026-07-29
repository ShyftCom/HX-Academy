-- Showcase Website foundation: venue fields on stations, CRM-reuse fields on leads,
-- multi-page fields on landing_pages, and new Programme/Coach/Pathway/Faq/News/Redirect tables.
--
-- Hand-authored to match Prisma's generated migration style (no live DATABASE_URL was
-- available to run `prisma migrate dev` against). All changes are additive and nullable
-- (or default-backed) so this is safe to apply to a populated database; nothing here
-- drops, renames, or tightens an existing column. The operative deploy mechanism for this
-- project is `prisma db push` (see package.json build script), which will apply the same
-- end-state described by schema.prisma independently of this file — this migration exists
-- for history/documentation parity with the existing prisma/migrations folder.

-- ==================== AlterTable: stations (Venue fields) ====================
ALTER TABLE "stations" ADD COLUMN "slug" TEXT;
ALTER TABLE "stations" ADD COLUMN "heroImageUrl" TEXT;
ALTER TABLE "stations" ADD COLUMN "galleryImages" TEXT;
ALTER TABLE "stations" ADD COLUMN "shortDescription" TEXT;
ALTER TABLE "stations" ADD COLUMN "shortDescriptionFr" TEXT;
ALTER TABLE "stations" ADD COLUMN "shortDescriptionAr" TEXT;
ALTER TABLE "stations" ADD COLUMN "fullDescription" TEXT;
ALTER TABLE "stations" ADD COLUMN "fullDescriptionFr" TEXT;
ALTER TABLE "stations" ADD COLUMN "fullDescriptionAr" TEXT;
ALTER TABLE "stations" ADD COLUMN "facilities" TEXT;
ALTER TABLE "stations" ADD COLUMN "pitchType" TEXT;
ALTER TABLE "stations" ADD COLUMN "changingRooms" TEXT;
ALTER TABLE "stations" ADD COLUMN "parkingInfo" TEXT;
ALTER TABLE "stations" ADD COLUMN "parkingInfoFr" TEXT;
ALTER TABLE "stations" ADD COLUMN "parkingInfoAr" TEXT;
ALTER TABLE "stations" ADD COLUMN "transportInfo" TEXT;
ALTER TABLE "stations" ADD COLUMN "transportInfoFr" TEXT;
ALTER TABLE "stations" ADD COLUMN "transportInfoAr" TEXT;
ALTER TABLE "stations" ADD COLUMN "accessibilityInfo" TEXT;
ALTER TABLE "stations" ADD COLUMN "accessibilityInfoFr" TEXT;
ALTER TABLE "stations" ADD COLUMN "accessibilityInfoAr" TEXT;
ALTER TABLE "stations" ADD COLUMN "googleMapsUrl" TEXT;
ALTER TABLE "stations" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "stations" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "stations" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "stations" ADD COLUMN "isPubliclyListed" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "stations_slug_key" ON "stations"("slug");

-- ==================== AlterTable: leads (CRM reuse for Contact/Squad/Newsletter) ====================
ALTER TABLE "leads" ADD COLUMN "programmeId" TEXT;
ALTER TABLE "leads" ADD COLUMN "extraData" TEXT;

-- ==================== AlterTable: landing_pages (multi-page section builder) ====================
ALTER TABLE "landing_pages" ADD COLUMN "slug" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "title" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "template" TEXT DEFAULT 'default';
ALTER TABLE "landing_pages" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "metaDescription" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "ogImage" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "canonicalUrl" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "noindex" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "landing_pages" ADD COLUMN "nofollow" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "landing_pages" ADD COLUMN "breadcrumbLabel" TEXT;

CREATE UNIQUE INDEX "landing_pages_slug_key" ON "landing_pages"("slug");

-- Backfill the existing (singleton) homepage row so the live site keeps resolving via slug="home"
UPDATE "landing_pages" SET "slug" = 'home', "title" = COALESCE("title", 'Homepage') WHERE "slug" IS NULL;

-- ==================== CreateTable: programme_categories ====================
CREATE TABLE "programme_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameFr" TEXT,
    "nameAr" TEXT,
    "slug" TEXT NOT NULL,
    "colorTag" TEXT NOT NULL DEFAULT '#3996D6',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programme_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "programme_categories_slug_key" ON "programme_categories"("slug");

-- ==================== CreateTable: coaches ====================
CREATE TABLE "coaches" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "role" TEXT,
    "roleFr" TEXT,
    "roleAr" TEXT,
    "bio" TEXT,
    "bioFr" TEXT,
    "bioAr" TEXT,
    "certifications" TEXT,
    "stationId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================== CreateTable: programmes ====================
CREATE TABLE "programmes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameFr" TEXT,
    "nameAr" TEXT,
    "shortDescription" TEXT,
    "shortDescriptionFr" TEXT,
    "shortDescriptionAr" TEXT,
    "fullDescription" TEXT,
    "fullDescriptionFr" TEXT,
    "fullDescriptionAr" TEXT,
    "heroImageUrl" TEXT,
    "cardImageUrl" TEXT,
    "categoryId" TEXT,
    "ageRangeLabel" TEXT,
    "ageRangeLabelFr" TEXT,
    "ageRangeLabelAr" TEXT,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "priceFrom" DOUBLE PRECISION,
    "priceLabel" TEXT,
    "priceLabelFr" TEXT,
    "priceLabelAr" TEXT,
    "promoBannerText" TEXT,
    "promoBannerTextFr" TEXT,
    "promoBannerTextAr" TEXT,
    "promoBannerUrl" TEXT,
    "bookingUrl" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImage" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPubliclyListed" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programmes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "programmes_slug_key" ON "programmes"("slug");
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "programme_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================== CreateTable: programme_schedules ====================
CREATE TABLE "programme_schedules" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "dobStart" TIMESTAMP(3),
    "dobEnd" TIMESTAMP(3),
    "sessionName" TEXT,
    "sessionType" TEXT,
    "day" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "venueId" TEXT,
    "coachId" TEXT,
    "capacity" INTEGER,
    "availableSpaces" INTEGER,
    "price" DOUBLE PRECISION,
    "registrationStatus" TEXT NOT NULL DEFAULT 'open',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programme_schedules_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "programme_schedules" ADD CONSTRAINT "programme_schedules_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_schedules" ADD CONSTRAINT "programme_schedules_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "programme_schedules" ADD CONSTRAINT "programme_schedules_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================== CreateTable: programme_venues ====================
CREATE TABLE "programme_venues" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "programme_venues_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "programme_venues_programmeId_venueId_key" ON "programme_venues"("programmeId", "venueId");
ALTER TABLE "programme_venues" ADD CONSTRAINT "programme_venues_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_venues" ADD CONSTRAINT "programme_venues_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== CreateTable: programme_coaches ====================
CREATE TABLE "programme_coaches" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "programme_coaches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "programme_coaches_programmeId_coachId_key" ON "programme_coaches"("programmeId", "coachId");
ALTER TABLE "programme_coaches" ADD CONSTRAINT "programme_coaches_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_coaches" ADD CONSTRAINT "programme_coaches_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== CreateTable: pathway_levels ====================
CREATE TABLE "pathway_levels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameFr" TEXT,
    "nameAr" TEXT,
    "ageRangeLabel" TEXT,
    "ageRangeLabelFr" TEXT,
    "ageRangeLabelAr" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3996D6',
    "icon" TEXT,
    "description" TEXT,
    "descriptionFr" TEXT,
    "descriptionAr" TEXT,
    "entryRequirements" TEXT,
    "entryRequirementsFr" TEXT,
    "entryRequirementsAr" TEXT,
    "objectives" TEXT,
    "objectivesFr" TEXT,
    "objectivesAr" TEXT,
    "programmeId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pathway_levels_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "pathway_levels" ADD CONSTRAINT "pathway_levels_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================== CreateTable: faqs ====================
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionFr" TEXT,
    "questionAr" TEXT,
    "answer" TEXT NOT NULL,
    "answerFr" TEXT,
    "answerAr" TEXT,
    "category" TEXT,
    "programmeId" TEXT,
    "stationId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================== CreateTable: news_categories ====================
CREATE TABLE "news_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameFr" TEXT,
    "nameAr" TEXT,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "news_categories_slug_key" ON "news_categories"("slug");

-- ==================== CreateTable: news_articles ====================
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleFr" TEXT,
    "titleAr" TEXT,
    "excerpt" TEXT,
    "excerptFr" TEXT,
    "excerptAr" TEXT,
    "body" TEXT,
    "bodyFr" TEXT,
    "bodyAr" TEXT,
    "coverImageUrl" TEXT,
    "categoryId" TEXT,
    "authorName" TEXT,
    "publishedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "news_articles_slug_key" ON "news_articles"("slug");
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "news_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================== CreateTable: redirects ====================
CREATE TABLE "redirects" (
    "id" TEXT NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 308,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "redirects_fromPath_key" ON "redirects"("fromPath");

-- ==================== AddForeignKey: leads.programmeId -> programmes (deferred until programmes exists) ====================
ALTER TABLE "leads" ADD CONSTRAINT "leads_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
