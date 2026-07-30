import { db } from "@/lib/db";
import { VenueCard } from "../cards/VenueCard";
import { lf } from "./localeField";

export async function VenueGridSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  const venues = await db.station.findMany({
    where: { status: "active", isPubliclyListed: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    take: content.limit ?? 6,
  });
  if (venues.length === 0) return null;

  return (
    <section className="bg-white py-[var(--fsa-section-y)]">
      <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
        {heading && <h2 className="mb-10 font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">{heading}</h2>}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => <VenueCard key={v.id} venue={v} locale={locale} />)}
        </div>
      </div>
    </section>
  );
}
