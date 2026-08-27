import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { Hero } from "@/components/website/Hero";
import { Breadcrumb } from "@/components/website/Breadcrumb";
import { ProgrammeCard } from "@/components/website/cards/ProgrammeCard";
import { lf } from "@/components/website/sections/localeField";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.programmes" });
  return pageMetadata({ locale, path: "/programmes", title: t("title"), description: t("description") });
}

export default async function ProgrammesListingPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ category?: string }> }) {
  const { locale } = await params;
  const { category } = await searchParams;
  const t = await getTranslations({ locale, namespace: "programmes" });

  const [programmes, categories] = await Promise.all([
    db.programme.findMany({
      where: { isPubliclyListed: true, ...(category ? { category: { slug: category } } : {}) },
      include: { category: true },
      orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.programmeCategory.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <Hero
        desktopImageUrl="https://images.unsplash.com/photo-1470114716159-e389f8712fda?w=1600&q=80"
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        align="left"
        verticalPosition="bottom"
        minHeight="55vh"
      />
      <Breadcrumb locale={locale} items={[{ label: t("breadcrumb") }]} />

      <section className="bg-white py-[var(--fsa-section-y)]">
        <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
          {categories.length > 0 && (
            <div className="mb-10 flex flex-wrap gap-2">
              <Link
                href={`/${locale}/programmes`}
                className={`rounded-fsa-pill px-4 py-2 text-sm font-semibold transition-colors ${!category ? "bg-fsa-navy-900 text-white" : "border border-fsa-border text-fsa-navy-900 hover:bg-fsa-pale-bg"}`}
              >
                {t("all")}
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/${locale}/programmes?category=${c.slug}`}
                  className={`rounded-fsa-pill px-4 py-2 text-sm font-semibold transition-colors ${category === c.slug ? "bg-fsa-navy-900 text-white" : "border border-fsa-border text-fsa-navy-900 hover:bg-fsa-pale-bg"}`}
                >
                  {lf(c as unknown as Record<string, unknown>, "name", locale)}
                </Link>
              ))}
            </div>
          )}

          {programmes.length === 0 ? (
            <p className="py-16 text-center text-fsa-text-muted">{t("empty")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {programmes.map((p) => (
                <ProgrammeCard key={p.id} programme={p} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
