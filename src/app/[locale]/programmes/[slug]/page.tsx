import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { pageMetadata } from "@/lib/seo";
import { Hero } from "@/components/website/Hero";
import { Breadcrumb } from "@/components/website/Breadcrumb";
import { SplitContentSection } from "@/components/website/sections/SplitContentSection";
import { PromoBannerSection } from "@/components/website/sections/PromoBannerSection";
import { FeatureCardsSection } from "@/components/website/sections/FeatureCardsSection";
import { ScheduleTable } from "@/components/website/ScheduleTable";
import { FaqAccordion } from "@/components/website/FaqAccordion";
import { ProgrammeCard } from "@/components/website/cards/ProgrammeCard";
import { CtaBannerSection } from "@/components/website/sections/CtaBannerSection";
import { lf } from "@/components/website/sections/localeField";
import { localeHref } from "@/components/website/localeHref";
import { mobileVariant } from "@/components/website/mobileVariant";

async function getProgramme(slug: string) {
  const programme = await db.programme.findUnique({
    where: { slug },
    include: {
      category: true,
      schedules: { where: { isActive: true }, orderBy: { order: "asc" }, include: { venue: true, coach: true } },
      coaches: { include: { coach: true }, orderBy: { order: "asc" } },
      faqs: { where: { isPublished: true }, orderBy: { order: "asc" } },
    },
  });
  if (!programme || !programme.isPubliclyListed) return null;
  return programme;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const programme = await getProgramme(slug);
  if (!programme) return {};
  const record = programme as unknown as Record<string, unknown>;
  return pageMetadata({
    locale,
    path: `/programmes/${slug}`,
    // metaTitle/metaDescription are single-column in the schema; fall back to
    // the localised name/description rather than to the English base value.
    title: programme.metaTitle || lf(record, "name", locale),
    description: programme.metaDescription || lf(record, "shortDescription", locale) || undefined,
    images: programme.ogImage ? [programme.ogImage] : undefined,
  });
}

export default async function ProgrammeDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const programme = await getProgramme(slug);
  if (!programme) notFound();

  const t = await getTranslations({ locale, namespace: "programmes" });
  const tFaq = await getTranslations({ locale, namespace: "faq" });

  const [related, defaultBookingUrl] = await Promise.all([
    db.programme.findMany({
      where: { isPubliclyListed: true, id: { not: programme.id }, ...(programme.categoryId ? { categoryId: programme.categoryId } : {}) },
      include: { category: true },
      orderBy: { displayOrder: "asc" },
      take: 3,
    }),
    getSetting("website_booking_url", "/apply"),
  ]);

  const name = lf(programme as unknown as Record<string, unknown>, "name", locale);
  // Resolve against the active locale: the stored value is typically the
  // bare "/apply", which would otherwise drop the visitor through a redirect.
  const bookingUrl = localeHref(programme.bookingUrl || defaultBookingUrl, locale);
  const ageRange = lf(programme as unknown as Record<string, unknown>, "ageRangeLabel", locale);
  const cover = programme.heroImageUrl || "/media/wide/dribbling.jpg";

  return (
    <>
      <Hero
        desktopImageUrl={cover}
        mobileImageUrl={mobileVariant(cover)}
        title={name}
        subtitle={ageRange || undefined}
        primaryCta={{ label: t("bookNow"), href: bookingUrl }}
        minHeight="60vh"
      />
      <Breadcrumb
        locale={locale}
        items={[
          { label: t("breadcrumb"), href: `/${locale}/programmes` },
          ...(programme.category ? [{ label: lf(programme.category as unknown as Record<string, unknown>, "name", locale), href: `/${locale}/programmes?category=${programme.category.slug}` }] : []),
          { label: name },
        ]}
      />

      {/* Intro split */}
      <SplitContentSection
        locale={locale}
        content={{
          imagePosition: "right",
          heading: name, headingFr: programme.nameFr, headingAr: programme.nameAr,
          body: lf(programme as unknown as Record<string, unknown>, "fullDescription", locale) || lf(programme as unknown as Record<string, unknown>, "shortDescription", locale),
          bodyFr: programme.fullDescriptionFr || programme.shortDescriptionFr,
          bodyAr: programme.fullDescriptionAr || programme.shortDescriptionAr,
          imageUrl: programme.cardImageUrl || programme.heroImageUrl,
          ctaLabel: t("bookNow"), ctaUrl: bookingUrl,
        }}
      />

      {/* Promo banner */}
      {programme.promoBannerText && (
        <PromoBannerSection
          locale={locale}
          content={{
            heading: programme.promoBannerText, headingFr: programme.promoBannerTextFr, headingAr: programme.promoBannerTextAr,
            body: programme.priceLabel, bodyFr: programme.priceLabelFr, bodyAr: programme.priceLabelAr,
            ctaLabel: t("bookNow"), ctaUrl: programme.promoBannerUrl || bookingUrl,
            bgColor: "sky",
          }}
        />
      )}

      {/* Feature columns (What we offer / What our coaches deliver) */}
      {programme.coaches.length > 0 && (
        <FeatureCardsSection
          locale={locale}
          content={{
            heading: t("meetCoaches"),
            cards: programme.coaches.map(({ coach }) => ({
              icon: "UserCheck",
              title: coach.fullName,
              titleFr: coach.fullName,
              body: lf(coach as unknown as Record<string, unknown>, "role", locale),
              bodyFr: coach.roleFr,
            })),
          }}
        />
      )}

      <ScheduleTable rows={programme.schedules} bookingUrl={bookingUrl} locale={locale} />

      {programme.faqs.length > 0 && <FaqAccordion items={programme.faqs} locale={locale} heading={tFaq("heading")} />}

      {related.length > 0 && (
        <section className="bg-fsa-pale-bg py-[var(--fsa-section-y)]">
          <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
            <h2 className="mb-10 font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">{t("related")}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProgrammeCard key={p.id} programme={p} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBannerSection locale={locale} content={{ heading: t("joinHeading", { name }), body: t("joinBody"), ctaLabel: t("bookNow"), ctaUrl: bookingUrl, style: "navy" }} />
    </>
  );
}
