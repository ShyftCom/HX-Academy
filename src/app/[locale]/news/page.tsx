import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { Hero } from "@/components/website/Hero";
import { Breadcrumb } from "@/components/website/Breadcrumb";
import { NewsCard } from "@/components/website/cards/NewsCard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.news" });
  return pageMetadata({ locale, path: "/news", title: t("title"), description: t("description") });
}

export default async function NewsListingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "news" });

  const articles = await db.newsArticle.findMany({
    where: { isPublished: true },
    include: { category: true },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
  });

  return (
    <>
      <Hero desktopImageUrl="/media/wide/squad-trip.jpg" mobileImageUrl="/media/mobile/squad-trip.jpg" title={t("heroTitle")} subtitle={t("heroSubtitle")} minHeight="50vh" />
      <Breadcrumb locale={locale} items={[{ label: t("breadcrumb") }]} />

      <section className="bg-white py-[var(--fsa-section-y)]">
        <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
          {articles.length === 0 ? (
            <p className="py-16 text-center text-fsa-text-muted">{t("empty")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => <NewsCard key={a.id} article={a} locale={locale} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
