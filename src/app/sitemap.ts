import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { routing } from "@/i18n/routing";

const STATIC_PATHS = [
  "",
  "/programmes",
  "/venues",
  "/squads",
  "/who-we-are",
  "/methodology",
  "/pathway",
  "/contact",
  "/news",
  "/reviews",
  "/store",
  "/summer-camp",
  "/apply",
];

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://footballskillsacademy.com";
}

/**
 * Every entry carries `alternates.languages` as well as its own URL, so the
 * sitemap states outright that /fr/x and /ar/x are the same document in two
 * languages. Without it each locale competes as a separate page.
 */
function alternatesFor(path: string) {
  const base = siteUrl();
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `${base}/${l}${path}`;
  languages["x-default"] = `${base}/${routing.defaultLocale}${path}`;
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [];

  const push = (path: string, extra: Partial<MetadataRoute.Sitemap[number]> = {}) => {
    for (const locale of routing.locales) {
      entries.push({
        url: `${base}/${locale}${path}`,
        alternates: alternatesFor(path),
        ...extra,
      });
    }
  };

  for (const path of STATIC_PATHS) {
    push(path, { changeFrequency: "weekly", priority: path === "" ? 1 : 0.7 });
  }

  try {
    const [programmes, venues, articles, products] = await Promise.all([
      db.programme.findMany({ where: { isPubliclyListed: true }, select: { slug: true, updatedAt: true } }),
      db.station.findMany({ where: { status: "active", isPubliclyListed: true, slug: { not: null } }, select: { slug: true, updatedAt: true } }),
      db.newsArticle.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
      db.product.findMany({ where: { slug: { not: null } }, select: { slug: true, updatedAt: true } }).catch(() => []),
    ]);

    for (const p of programmes) push(`/programmes/${p.slug}`, { lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.8 });
    for (const v of venues) push(`/venues/${v.slug}`, { lastModified: v.updatedAt, changeFrequency: "monthly", priority: 0.6 });
    for (const a of articles) push(`/news/${a.slug}`, { lastModified: a.updatedAt, changeFrequency: "monthly", priority: 0.5 });
    for (const pr of products) if (pr.slug) push(`/store/${pr.slug}`, { lastModified: pr.updatedAt, changeFrequency: "weekly", priority: 0.5 });
  } catch {
    // DB unavailable — ship the static routes only rather than failing the whole sitemap.
  }

  return entries;
}
