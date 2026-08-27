import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPublishedPage } from "@/lib/slugPage";
import { SlugPageBody } from "@/components/website/SlugPageBody";
import { pageMetadata } from "@/lib/seo";
import { lf } from "@/components/website/sections/localeField";

const SLUG = "who-we-are";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.whoWeAre" });
  const page = await getPublishedPage(SLUG);
  // LandingPage.metaTitle/metaDescription are single-column in the schema, so
  // an admin-authored value is used as-is for both locales; the translated
  // title is the fallback rather than an English literal.
  return pageMetadata({
    locale,
    path: `/${SLUG}`,
    title: lf(page as never, "metaTitle", locale) || t("title"),
    description: lf(page as never, "metaDescription", locale) || t("description"),
  });
}

export default async function WhoWeArePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.whoWeAre" });
  const page = await getPublishedPage(SLUG);
  if (!page) notFound();

  return <SlugPageBody sections={page.sections} locale={locale} breadcrumbLabel={lf(page as never, "breadcrumbLabel", locale) || t("title")} />;
}
