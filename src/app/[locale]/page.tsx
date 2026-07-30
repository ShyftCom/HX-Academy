import type { Metadata } from "next";
import { db } from "@/lib/db";
import { SectionRenderer } from "@/components/website/sections/SectionRenderer";
import { Hero } from "@/components/website/Hero";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  try {
    const page = await db.landingPage.findUnique({ where: { slug: "home" } });
    return {
      title: page?.metaTitle || "Football Skills Academy",
      description: page?.metaDescription || "Train, compete and grow with Football Skills Academy.",
      alternates: { canonical: page?.canonicalUrl || `/${locale}` },
      robots: page?.noindex ? { index: false, follow: !page?.nofollow } : undefined,
    };
  } catch {
    return { title: "Football Skills Academy" };
  }
}

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

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
        desktopImageUrl="https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1600&q=80"
        title="Football Skills Academy"
        subtitle="Homepage content has not been published yet. Add sections from Super Admin → Showcase Website → Pages."
        align="center"
        verticalPosition="center"
      />
    );
  }

  return <SectionRenderer sections={sections} locale={locale} />;
}
