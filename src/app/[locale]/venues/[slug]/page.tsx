import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone, Mail, Car, Bus, Accessibility, Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { pageMetadata } from "@/lib/seo";
import { Hero } from "@/components/website/Hero";
import { Breadcrumb } from "@/components/website/Breadcrumb";
import { ProgrammeCard } from "@/components/website/cards/ProgrammeCard";
import { FaqAccordion } from "@/components/website/FaqAccordion";
import { ScheduleTable } from "@/components/website/ScheduleTable";
import { FsaButton } from "@/components/website/buttons/FsaButton";
import { lf } from "@/components/website/sections/localeField";
import { wilayaLabel, wilayaNames } from "@/lib/public-wilaya";
import { localeHref } from "@/components/website/localeHref";
import { mobileVariant } from "@/components/website/mobileVariant";

async function getVenue(slug: string) {
  const venue = await db.station.findUnique({ where: { slug } });
  if (!venue || !venue.isPubliclyListed || venue.status !== "active") return null;
  return venue;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const venue = await getVenue(slug);
  if (!venue) return {};
  const record = venue as unknown as Record<string, unknown>;
  return pageMetadata({
    locale,
    path: `/venues/${slug}`,
    title: lf(record, "name", locale) || venue.name,
    description: lf(record, "shortDescription", locale) || undefined,
    images: venue.heroImageUrl ? [venue.heroImageUrl] : undefined,
  });
}

export default async function VenueDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const venue = await getVenue(slug);
  if (!venue) notFound();

  const t = await getTranslations({ locale, namespace: "venues" });
  const tFaq = await getTranslations({ locale, namespace: "faq" });
  const tSchedule = await getTranslations({ locale, namespace: "schedule" });

  const [programmes, faqs, defaultBookingUrl, schedule, slots, otherVenues] = await Promise.all([
    db.programme.findMany({
      where: { isPubliclyListed: true, OR: [{ venues: { some: { venueId: venue.id } } }, { schedules: { some: { stationId: venue.id } } }] },
      include: { category: true },
      take: 6,
    }),
    db.faq.findMany({ where: { isPublished: true, stationId: venue.id }, orderBy: { order: "asc" } }),
    getSetting("website_booking_url", "/apply"),
    // This location's own schedule — nothing here is shared with any other venue.
    db.locationSchedule.findUnique({ where: { stationId: venue.id } }),
    db.scheduleSlot.findMany({
      where: { stationId: venue.id, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }, { order: "asc" }],
    }),
    // Lets a visitor jump straight to another location's schedule without going
    // back to the index — plain links, so it works with no client JS and in RTL.
    db.station.findMany({
      where: { status: "active", isPubliclyListed: true, slug: { not: null }, id: { not: venue.id } },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, nameFr: true, nameAr: true, slug: true },
    }),
  ]);

  // An unpublished header hides the timetable without deleting a single slot.
  const showSchedule = schedule?.isPublished !== false;

  // Each locale holds its own JSON list; lf() picks one, then it is parsed.
  let facilities: string[] = [];
  try {
    const parsed = JSON.parse(lf(venue as unknown as Record<string, unknown>, "facilities", locale) || "[]");
    if (Array.isArray(parsed)) facilities = parsed.filter((f): f is string => typeof f === "string");
  } catch { /* noop */ }

  const description = lf(venue as unknown as Record<string, unknown>, "fullDescription", locale) || lf(venue as unknown as Record<string, unknown>, "shortDescription", locale);
  const venueName = lf(venue as unknown as Record<string, unknown>, "name", locale) || venue.name;
  const venueWilaya = wilayaLabel(await wilayaNames(), venue, locale);

  return (
    <>
      {/* No stock fallback: an unphotographed venue gets the brand panel, so the
          page never shows a stadium that is not this one. Real photos go in
          Dashboard → Stations → [station] → Public / Marketing. */}
      <Hero
        desktopImageUrl={venue.heroImageUrl || undefined}
        mobileImageUrl={mobileVariant(venue.heroImageUrl)}
        title={venueName}
        subtitle={venueWilaya}
        minHeight="55vh"
      />
      <Breadcrumb locale={locale} items={[{ label: t("breadcrumb"), href: `/${locale}/venues` }, { label: venueName }]} />

      <section className="bg-white py-[var(--fsa-section-y)]">
        <div className="mx-auto grid grid-cols-1 gap-12 px-[var(--fsa-container-pad)] lg:grid-cols-3" style={{ maxWidth: "var(--fsa-container-max)" }}>
          <div className="space-y-8 lg:col-span-2">
            {description && <p className="text-lg leading-relaxed text-fsa-text" dir="auto">{description}</p>}

            {facilities.length > 0 && (
              <div>
                <h2 className="mb-4 font-fsa-display text-2xl font-bold uppercase text-fsa-navy-900">{t("facilities")}</h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {facilities.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-fsa-text">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fsa-sky/20"><Check className="h-3 w-3 text-fsa-navy-900" /></span>
                      <span dir="auto">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(venue.parkingInfo || venue.transportInfo || venue.accessibilityInfo) && (
              <div className="space-y-4 rounded-fsa-md bg-fsa-pale-bg p-6">
                <h2 className="font-fsa-display text-xl font-bold uppercase text-fsa-navy-900">{t("gettingThere")}</h2>
                {venue.parkingInfo && <p className="flex items-start gap-2 text-sm text-fsa-text"><Car className="mt-0.5 h-4 w-4 shrink-0 text-fsa-heading-blue" /> {lf(venue as unknown as Record<string, unknown>, "parkingInfo", locale)}</p>}
                {venue.transportInfo && <p className="flex items-start gap-2 text-sm text-fsa-text"><Bus className="mt-0.5 h-4 w-4 shrink-0 text-fsa-heading-blue" /> {lf(venue as unknown as Record<string, unknown>, "transportInfo", locale)}</p>}
                {venue.accessibilityInfo && <p className="flex items-start gap-2 text-sm text-fsa-text"><Accessibility className="mt-0.5 h-4 w-4 shrink-0 text-fsa-heading-blue" /> {lf(venue as unknown as Record<string, unknown>, "accessibilityInfo", locale)}</p>}
              </div>
            )}
          </div>

          <aside className="space-y-4 rounded-fsa-md border border-fsa-border p-6">
            <h3 className="font-fsa-display text-lg font-bold uppercase text-fsa-navy-900">{t("details")}</h3>
            {venue.address && <p className="flex items-start gap-2 text-sm text-fsa-text"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-fsa-text-muted" /> {venue.address}</p>}
            {venue.phone && <p className="flex items-center gap-2 text-sm text-fsa-text"><Phone className="h-4 w-4 shrink-0 text-fsa-text-muted" /> {venue.phone}</p>}
            {venue.email && <p className="flex items-center gap-2 text-sm text-fsa-text"><Mail className="h-4 w-4 shrink-0 text-fsa-text-muted" /> {venue.email}</p>}
            {venue.googleMapsUrl && (
              <FsaButton href={venue.googleMapsUrl} variant="outline-navy" external icon size="sm" className="w-full">
                {t("getDirections")}
              </FsaButton>
            )}
            <FsaButton href={localeHref(defaultBookingUrl, locale)} variant="sky" size="sm" className="w-full">{t("bookNow")}</FsaButton>
          </aside>
        </div>
      </section>

      {showSchedule && (
        <>
          <ScheduleTable
            rows={slots}
            locale={locale}
            heading={tSchedule("headingAt", { name: venueName })}
            showLocation={false}
            emptyState
            bookingUrl={localeHref(defaultBookingUrl, locale)}
          />
          {otherVenues.length > 0 && (
            <section className="bg-fsa-pale-bg pb-[var(--fsa-section-y)]">
              <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
                <p className="mb-3 text-center text-sm font-semibold text-fsa-text-muted">{tSchedule("otherLocations")}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {otherVenues.map((v) => (
                    <Link
                      key={v.id}
                      href={`/${locale}/venues/${v.slug}`}
                      className="rounded-fsa-pill border border-fsa-border bg-white px-4 py-2 text-sm text-fsa-navy-900 transition-colors hover:border-fsa-sky hover:bg-fsa-sky/10"
                    >
                      <span dir="auto">{lf(v as unknown as Record<string, unknown>, "name", locale) || v.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {programmes.length > 0 && (
        <section className="bg-fsa-pale-bg py-[var(--fsa-section-y)]">
          <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
            <h2 className="mb-10 font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">{t("programmesAt", { name: venueName })}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {programmes.map((p) => <ProgrammeCard key={p.id} programme={p} locale={locale} />)}
            </div>
          </div>
        </section>
      )}

      {faqs.length > 0 && <FaqAccordion items={faqs} locale={locale} heading={tFaq("heading")} />}
    </>
  );
}
