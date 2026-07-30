import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Hero } from "@/components/website/Hero";
import { Breadcrumb } from "@/components/website/Breadcrumb";
import { NewsCard } from "@/components/website/cards/NewsCard";

export const metadata: Metadata = {
  title: "News | Football Skills Academy",
  description: "Latest news, results and updates from Football Skills Academy.",
};

export default async function NewsListingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const articles = await db.newsArticle.findMany({
    where: { isPublished: true },
    include: { category: true },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
  });

  return (
    <>
      <Hero desktopImageUrl="https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1600&q=80" title="News" subtitle="The latest from across Football Skills Academy." minHeight="50vh" />
      <Breadcrumb locale={locale} items={[{ label: "News" }]} />

      <section className="bg-white py-[var(--fsa-section-y)]">
        <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
          {articles.length === 0 ? (
            <p className="py-16 text-center text-fsa-text-muted">No news articles have been published yet.</p>
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
