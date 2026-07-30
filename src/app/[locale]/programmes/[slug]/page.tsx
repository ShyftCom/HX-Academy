import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const programme = await getProgramme(slug);
  if (!programme) return {};
  return {
    title: programme.metaTitle || `${programme.name} | Football Skills Academy`,
    description: programme.metaDescription || programme.shortDescription || undefined,
    openGraph: programme.ogImage ? { images: [programme.ogImage] } : undefined,
  };
}

export default async function ProgrammeDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const programme = await getProgramme(slug);
  if (!programme) notFound();

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
  const bookingUrl = programme.bookingUrl || defaultBookingUrl;
  const ageRange = lf(programme as unknown as Record<string, unknown>, "ageRangeLabel", locale);

  return (
    <>
      <Hero
        desktopImageUrl={programme.heroImageUrl || "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1600&q=80"}
        title={name}
        subtitle={ageRange || undefined}
        primaryCta={{ label: "Book Now", href: bookingUrl }}
        minHeight="60vh"
      />
      <Breadcrumb
        locale={locale}
        items={[
          { label: "Programmes", href: `/${locale}/programmes` },
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
          ctaLabel: "Book Now", ctaUrl: bookingUrl,
        }}
      />

      {/* Promo banner */}
      {programme.promoBannerText && (
        <PromoBannerSection
          locale={locale}
          content={{
            heading: programme.promoBannerText, headingFr: programme.promoBannerTextFr, headingAr: programme.promoBannerTextAr,
            body: programme.priceLabel, bodyFr: programme.priceLabelFr, bodyAr: programme.priceLabelAr,
            ctaLabel: "Book Now", ctaUrl: programme.promoBannerUrl || bookingUrl,
            bgColor: "sky",
          }}
        />
      )}

      {/* Feature columns (What we offer / What our coaches deliver) */}
      {programme.coaches.length > 0 && (
        <FeatureCardsSection
          locale={locale}
          content={{
            heading: "Meet the Coaches",
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

      <ScheduleTable rows={programme.schedules} bookingUrl={bookingUrl} />

      {programme.faqs.length > 0 && <FaqAccordion items={programme.faqs} locale={locale} heading="Frequently Asked Questions" />}

      {related.length > 0 && (
        <section className="bg-fsa-pale-bg py-[var(--fsa-section-y)]">
          <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
            <h2 className="mb-10 font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">Related Programmes</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProgrammeCard key={p.id} programme={p} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBannerSection locale={locale} content={{ heading: `Join ${name}`, body: "Spaces are limited — book your place today.", ctaLabel: "Book Now", ctaUrl: bookingUrl, style: "navy" }} />
    </>
  );
}
