import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPublishedPage } from "@/lib/slugPage";
import { SlugPageBody } from "@/components/website/SlugPageBody";
import { pageMetadata, adminOrTranslated } from "@/lib/seo";

const SLUG = "pathway";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.pathway" });
  const page = await getPublishedPage(SLUG);
  // LandingPage.metaTitle/metaDescription are single-column in the schema, so
  // an admin-authored value is used as-is for both locales; the translated
  // title is the fallback rather than an English literal.
  return pageMetadata({
    locale,
    path: `/${SLUG}`,
    title: adminOrTranslated(page?.metaTitle, t("title"), locale),
    description: adminOrTranslated(page?.metaDescription, t("description"), locale) || undefined,
  });
}

export default async function PathwayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.pathway" });
  const page = await getPublishedPage(SLUG);
  if (!page) notFound();

  return <SlugPageBody sections={page.sections} locale={locale} breadcrumbLabel={adminOrTranslated(page.breadcrumbLabel, t("title"), locale)} />;
}
