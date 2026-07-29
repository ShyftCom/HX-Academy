import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPage } from "@/lib/slugPage";
import { SlugPageBody } from "@/components/website/SlugPageBody";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("methodology");
  return { title: page?.metaTitle || "Methodology | Football Skills Academy", description: page?.metaDescription || undefined };
}

export default async function MethodologyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await getPublishedPage("methodology");
  if (!page) notFound();

  return <SlugPageBody sections={page.sections} locale={locale} breadcrumbLabel={page.breadcrumbLabel || "Methodology"} />;
}
