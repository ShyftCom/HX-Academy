import { db } from "@/lib/db";
import { NewsCard } from "../cards/NewsCard";
import { lf } from "./localeField";

export async function NewsGridSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  const articles = await db.newsArticle.findMany({
    where: { isPublished: true },
    include: { category: true },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take: content.limit ?? 3,
  });
  if (articles.length === 0) return null;

  return (
    <section className="bg-white py-[var(--fsa-section-y)]">
      <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
        {heading && <h2 className="mb-10 font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">{heading}</h2>}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => <NewsCard key={a.id} article={a} locale={locale} />)}
        </div>
      </div>
    </section>
  );
}
