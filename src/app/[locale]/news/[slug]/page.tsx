import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/public-format";
import { Hero } from "@/components/website/Hero";
import { Breadcrumb } from "@/components/website/Breadcrumb";
import { NewsCard } from "@/components/website/cards/NewsCard";
import { lf } from "@/components/website/sections/localeField";
import { mobileVariant } from "@/components/website/mobileVariant";

async function getArticle(slug: string) {
  const article = await db.newsArticle.findUnique({ where: { slug }, include: { category: true } });
  if (!article || !article.isPublished) return null;
  return article;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  const record = article as unknown as Record<string, unknown>;
  const image = article.ogImage || article.coverImageUrl;
  return pageMetadata({
    locale,
    path: `/news/${slug}`,
    // An admin-set SEO override wins, but only in the locale being rendered:
    // an English metaTitle left over from before the locale columns existed
    // must not outrank the translated headline.
    title: lf(record, "metaTitle", locale) || lf(record, "title", locale),
    description: lf(record, "metaDescription", locale) || lf(record, "excerpt", locale) || undefined,
    images: image ? [image] : undefined,
  });
}

export default async function NewsDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const t = await getTranslations({ locale, namespace: "news" });

  const related = await db.newsArticle.findMany({
    where: { isPublished: true, id: { not: article.id }, ...(article.categoryId ? { categoryId: article.categoryId } : {}) },
    include: { category: true },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  const cover = article.coverImageUrl || "/media/wide/team-talk.jpg";
  const title = lf(article as unknown as Record<string, unknown>, "title", locale);
  const body = lf(article as unknown as Record<string, unknown>, "body", locale);

  return (
    <>
      <Hero desktopImageUrl={cover} mobileImageUrl={mobileVariant(cover)} title={title} minHeight="45vh" />
      <Breadcrumb locale={locale} items={[{ label: t("breadcrumb"), href: `/${locale}/news` }, { label: title }]} />

      <article className="bg-white py-[var(--fsa-section-y)]">
        <div className="mx-auto max-w-3xl px-[var(--fsa-container-pad)]">
          <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-fsa-text-muted">
            {article.publishedAt && <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {formatDate(article.publishedAt, locale)}</span>}
            {article.authorName && <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {article.authorName}</span>}
            {article.category && <span className="rounded-fsa-pill bg-fsa-pale-bg px-3 py-1 text-xs font-semibold text-fsa-navy-900">{lf(article.category as unknown as Record<string, unknown>, "name", locale)}</span>}
          </div>
          {body && <div className="fsa-richtext text-lg text-fsa-text" dir="auto" dangerouslySetInnerHTML={{ __html: body }} />}
        </div>
      </article>

      {related.length > 0 && (
        <section className="bg-fsa-pale-bg py-[var(--fsa-section-y)]">
          <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
            <h2 className="mb-10 font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">{t("more")}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a) => <NewsCard key={a.id} article={a} locale={locale} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
