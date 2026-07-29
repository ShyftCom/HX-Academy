import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Hero } from "@/components/website/Hero";
import { Breadcrumb } from "@/components/website/Breadcrumb";
import { VenueCard } from "@/components/website/cards/VenueCard";

export const metadata: Metadata = {
  title: "Venues | Football Skills Academy",
  description: "Find a Football Skills Academy venue near you — training pitches, facilities and how to get there.",
};

export default async function VenuesListingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const venues = await db.station.findMany({
    where: { status: "active", isPubliclyListed: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <Hero
        desktopImageUrl="https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1600&q=80"
        title="Our Venues"
        subtitle="World-class facilities across our locations — find the venue closest to you."
        minHeight="55vh"
      />
      <Breadcrumb locale={locale} items={[{ label: "Venues" }]} />

      <section className="bg-white py-[var(--fsa-section-y)]">
        <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
          {venues.length === 0 ? (
            <p className="py-16 text-center text-fsa-text-muted">Venue information is being updated — check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map((v) => (
                <VenueCard key={v.id} venue={v} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
