import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { lf } from "@/components/website/sections/localeField";
import { SectionRenderer } from "@/components/website/sections/SectionRenderer";
import { Hero } from "@/components/website/Hero";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.home" });
  try {
    const page = await db.landingPage.findUnique({ where: { slug: "home" } });
    const meta = pageMetadata({
      locale,
      path: "",
      title: lf(page as never, "metaTitle", locale) || t("title"),
      description: lf(page as never, "metaDescription", locale) || t("description"),
      noindex: page?.noindex ?? false,
      nofollow: page?.nofollow ?? false,
    });
    // An admin-set canonical wins, but the hreflang alternates are kept either
    // way — otherwise /fr and /ar stop being declared as translations.
    if (page?.canonicalUrl) meta.alternates.canonical = page.canonicalUrl;
    return meta;
  } catch {
    return pageMetadata({ locale, path: "", title: t("title"), description: t("description") });
  }
}

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  let sections: { id: string; type: string; content: string; isEnabled: boolean }[] = [];
  try {
    const page = await db.landingPage.findUnique({
      where: { slug: "home" },
      include: { sections: { where: { isEnabled: true }, orderBy: { order: "asc" } } },
    });
    sections = page?.sections ?? [];
  } catch {
    // DB unreachable — fall through to the safety-net hero below rather than a blank page.
  }

  if (sections.length === 0) {
    // Fresh install (before Super Admin publishes homepage content) or DB
    // unavailable — a minimal, on-brand placeholder instead of a blank page.
    return (
      <Hero
        desktopImageUrl="/media/wide/team-talk.jpg"
        mobileImageUrl="/media/mobile/team-talk.jpg"
        title={t("emptyTitle")}
        subtitle={t("emptyBody")}
        align="center"
        verticalPosition="center"
      />
    );
  }

  return <SectionRenderer sections={sections} locale={locale} />;
}
