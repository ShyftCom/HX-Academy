import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Hero } from "@/components/website/Hero";
import { Breadcrumb } from "@/components/website/Breadcrumb";
import { ProgrammeCard } from "@/components/website/cards/ProgrammeCard";
import { lf } from "@/components/website/sections/localeField";

export const metadata: Metadata = {
  title: "Programmes | Football Skills Academy",
  description: "Explore Football Skills Academy programmes — weekly training, holiday courses, development squads and more, for players aged 6-16.",
};

export default async function ProgrammesListingPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ category?: string }> }) {
  const { locale } = await params;
  const { category } = await searchParams;

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
        title="Programmes"
        subtitle="Structured football programmes for every age and ability, all built around our long-term player development pathway."
        align="left"
        verticalPosition="bottom"
        minHeight="55vh"
      />
      <Breadcrumb locale={locale} items={[{ label: "Programmes" }]} />

      <section className="bg-white py-[var(--fsa-section-y)]">
        <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
          {categories.length > 0 && (
            <div className="mb-10 flex flex-wrap gap-2">
              <Link
                href={`/${locale}/programmes`}
                className={`rounded-fsa-pill px-4 py-2 text-sm font-semibold transition-colors ${!category ? "bg-fsa-navy-900 text-white" : "border border-fsa-border text-fsa-navy-900 hover:bg-fsa-pale-bg"}`}
              >
                All Programmes
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
            <p className="py-16 text-center text-fsa-text-muted">Programmes are being updated — check back soon.</p>
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
