import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { routing } from "@/i18n/routing";

const STATIC_PATHS = ["", "/programmes", "/venues", "/squads", "/who-we-are", "/methodology", "/pathway", "/contact", "/news"];

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://footballskillsacademy.com";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push({ url: `${base}/${locale}${path}`, changeFrequency: "weekly", priority: path === "" ? 1 : 0.7 });
    }
  }

  try {
    const [programmes, venues, articles] = await Promise.all([
      db.programme.findMany({ where: { isPubliclyListed: true }, select: { slug: true, updatedAt: true } }),
      db.station.findMany({ where: { status: "active", isPubliclyListed: true, slug: { not: null } }, select: { slug: true, updatedAt: true } }),
      db.newsArticle.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    ]);

    for (const locale of routing.locales) {
      for (const p of programmes) entries.push({ url: `${base}/${locale}/programmes/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.8 });
      for (const v of venues) entries.push({ url: `${base}/${locale}/venues/${v.slug}`, lastModified: v.updatedAt, changeFrequency: "monthly", priority: 0.6 });
      for (const a of articles) entries.push({ url: `${base}/${locale}/news/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly", priority: 0.5 });
    }
  } catch {
    // DB unavailable — ship the static routes only rather than failing the whole sitemap.
  }

  return entries;
}
