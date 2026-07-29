import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPage } from "@/lib/slugPage";
import { SlugPageBody } from "@/components/website/SlugPageBody";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("who-we-are");
  return { title: page?.metaTitle || "Who We Are | Football Skills Academy", description: page?.metaDescription || undefined };
}

export default async function WhoWeArePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await getPublishedPage("who-we-are");
  if (!page) notFound();

  return <SlugPageBody sections={page.sections} locale={locale} breadcrumbLabel={page.breadcrumbLabel || "Who We Are"} />;
}
