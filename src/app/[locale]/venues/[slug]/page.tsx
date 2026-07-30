import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, Phone, Mail, Car, Bus, Accessibility, Check } from "lucide-react";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { Hero } from "@/components/website/Hero";
import { Breadcrumb } from "@/components/website/Breadcrumb";
import { ProgrammeCard } from "@/components/website/cards/ProgrammeCard";
import { FaqAccordion } from "@/components/website/FaqAccordion";
import { FsaButton } from "@/components/website/buttons/FsaButton";
import { lf } from "@/components/website/sections/localeField";

async function getVenue(slug: string) {
  const venue = await db.station.findUnique({ where: { slug } });
  if (!venue || !venue.isPubliclyListed || venue.status !== "active") return null;
  return venue;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenue(slug);
  if (!venue) return {};
  return { title: `${venue.name} | Football Skills Academy`, description: venue.shortDescription || undefined };
}

export default async function VenueDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const venue = await getVenue(slug);
  if (!venue) notFound();

  const [programmes, faqs, defaultBookingUrl] = await Promise.all([
    db.programme.findMany({
      where: { isPubliclyListed: true, OR: [{ venues: { some: { venueId: venue.id } } }, { schedules: { some: { venueId: venue.id } } }] },
      include: { category: true },
      take: 6,
    }),
    db.faq.findMany({ where: { isPublished: true, stationId: venue.id }, orderBy: { order: "asc" } }),
    getSetting("website_booking_url", "/apply"),
  ]);

  let facilities: string[] = [];
  try { facilities = JSON.parse(venue.facilities ?? "[]"); } catch { /* noop */ }

  const description = lf(venue as unknown as Record<string, unknown>, "fullDescription", locale) || lf(venue as unknown as Record<string, unknown>, "shortDescription", locale);

  return (
    <>
      {/* No stock fallback: an unphotographed venue gets the brand panel, so the
          page never shows a stadium that is not this one. Real photos go in
          Dashboard → Stations → [station] → Public / Marketing. */}
      <Hero desktopImageUrl={venue.heroImageUrl || undefined} title={venue.name} subtitle={venue.wilaya} minHeight="55vh" />
      <Breadcrumb locale={locale} items={[{ label: "Venues", href: `/${locale}/venues` }, { label: venue.name }]} />

      <section className="bg-white py-[var(--fsa-section-y)]">
        <div className="mx-auto grid grid-cols-1 gap-12 px-[var(--fsa-container-pad)] lg:grid-cols-3" style={{ maxWidth: "var(--fsa-container-max)" }}>
          <div className="space-y-8 lg:col-span-2">
            {description && <p className="text-lg leading-relaxed text-fsa-text">{description}</p>}

            {facilities.length > 0 && (
              <div>
                <h2 className="mb-4 font-fsa-display text-2xl font-bold uppercase text-fsa-navy-900">Facilities</h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {facilities.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-fsa-text">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fsa-sky/20"><Check className="h-3 w-3 text-fsa-navy-900" /></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(venue.parkingInfo || venue.transportInfo || venue.accessibilityInfo) && (
              <div className="space-y-4 rounded-fsa-md bg-fsa-pale-bg p-6">
                <h2 className="font-fsa-display text-xl font-bold uppercase text-fsa-navy-900">Getting There</h2>
                {venue.parkingInfo && <p className="flex items-start gap-2 text-sm text-fsa-text"><Car className="mt-0.5 h-4 w-4 shrink-0 text-fsa-heading-blue" /> {lf(venue as unknown as Record<string, unknown>, "parkingInfo", locale)}</p>}
                {venue.transportInfo && <p className="flex items-start gap-2 text-sm text-fsa-text"><Bus className="mt-0.5 h-4 w-4 shrink-0 text-fsa-heading-blue" /> {lf(venue as unknown as Record<string, unknown>, "transportInfo", locale)}</p>}
                {venue.accessibilityInfo && <p className="flex items-start gap-2 text-sm text-fsa-text"><Accessibility className="mt-0.5 h-4 w-4 shrink-0 text-fsa-heading-blue" /> {lf(venue as unknown as Record<string, unknown>, "accessibilityInfo", locale)}</p>}
              </div>
            )}
          </div>

          <aside className="space-y-4 rounded-fsa-md border border-fsa-border p-6">
            <h3 className="font-fsa-display text-lg font-bold uppercase text-fsa-navy-900">Venue Details</h3>
            {venue.address && <p className="flex items-start gap-2 text-sm text-fsa-text"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-fsa-text-muted" /> {venue.address}</p>}
            {venue.phone && <p className="flex items-center gap-2 text-sm text-fsa-text"><Phone className="h-4 w-4 shrink-0 text-fsa-text-muted" /> {venue.phone}</p>}
            {venue.email && <p className="flex items-center gap-2 text-sm text-fsa-text"><Mail className="h-4 w-4 shrink-0 text-fsa-text-muted" /> {venue.email}</p>}
            {venue.googleMapsUrl && (
              <FsaButton href={venue.googleMapsUrl} variant="outline-navy" external icon size="sm" className="w-full">
                Get Directions
              </FsaButton>
            )}
            <FsaButton href={defaultBookingUrl} variant="sky" size="sm" className="w-full">Book Now</FsaButton>
          </aside>
        </div>
      </section>

      {programmes.length > 0 && (
        <section className="bg-fsa-pale-bg py-[var(--fsa-section-y)]">
          <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
            <h2 className="mb-10 font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">Programmes at {venue.name}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {programmes.map((p) => <ProgrammeCard key={p.id} programme={p} locale={locale} />)}
            </div>
          </div>
        </section>
      )}

      {faqs.length > 0 && <FaqAccordion items={faqs} locale={locale} heading="Frequently Asked Questions" />}
    </>
  );
}
