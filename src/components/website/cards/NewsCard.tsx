import Link from "next/link";
import Image from "next/image";
import { CalendarDays, ArrowRight } from "lucide-react";
import { lf } from "../sections/localeField";

export interface NewsCardData {
  slug: string;
  title: string;
  titleFr?: string | null;
  titleAr?: string | null;
  excerpt?: string | null;
  excerptFr?: string | null;
  excerptAr?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: Date | string | null;
  category?: { name: string; nameFr?: string | null; nameAr?: string | null } | null;
}

export function NewsCard({ article, locale }: { article: NewsCardData; locale: string }) {
  const title = lf(article as unknown as Record<string, unknown>, "title", locale);
  const excerpt = lf(article as unknown as Record<string, unknown>, "excerpt", locale);
  const date = article.publishedAt ? new Date(article.publishedAt) : null;

  return (
    <Link href={`/${locale}/news/${article.slug}`} className="group flex flex-col overflow-hidden rounded-fsa-lg border border-fsa-border bg-white shadow-fsa-card transition-shadow hover:shadow-lg">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-fsa-pale-bg">
        {article.coverImageUrl && <Image src={article.coverImageUrl} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />}
        {article.category && (
          <span className="absolute start-3 top-3 rounded-fsa-pill bg-fsa-navy-900/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {lf(article.category as unknown as Record<string, unknown>, "name", locale)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {date && <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-fsa-text-muted"><CalendarDays className="h-3.5 w-3.5" /> {date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>}
        <h3 className="font-fsa-display text-lg font-bold text-fsa-navy-900">{title}</h3>
        {excerpt && <p className="mt-2 line-clamp-2 flex-1 text-sm text-fsa-text-muted">{excerpt}</p>}
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-fsa-navy-900">
          Read more <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
