import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { Hero } from "@/components/website/Hero";
import { Breadcrumb } from "@/components/website/Breadcrumb";
import { VenueCard } from "@/components/website/cards/VenueCard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.venues" });
  return pageMetadata({ locale, path: "/venues", title: t("title"), description: t("description") });
}

export default async function VenuesListingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "venues" });

  const venues = await db.station.findMany({
    where: { status: "active", isPubliclyListed: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <Hero
        desktopImageUrl="/media/wide/first-touch.jpg"
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        minHeight="55vh"
      />
      <Breadcrumb locale={locale} items={[{ label: t("breadcrumb") }]} />

      <section className="bg-white py-[var(--fsa-section-y)]">
        <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
          {venues.length === 0 ? (
            <p className="py-16 text-center text-fsa-text-muted">{t("empty")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map((v) => (
                <VenueCard key={v.id} venue={v} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
