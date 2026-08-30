import Link from "next/link";
import Image from "next/image";
import { MapPin, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { lf } from "../sections/localeField";
import { wilayaLabel, wilayaNames } from "@/lib/public-wilaya";

export interface VenueCardData {
  slug: string | null;
  name: string;
  nameFr?: string | null;
  nameAr?: string | null;
  wilaya: string;
  wilayaCode?: number | null;
  heroImageUrl?: string | null;
  shortDescription?: string | null;
  shortDescriptionFr?: string | null;
  shortDescriptionAr?: string | null;
}

export async function VenueCard({ venue, locale }: { venue: VenueCardData; locale: string }) {
  const t = await getTranslations({ locale, namespace: "venues" });
  const wilaya = wilayaLabel(await wilayaNames(), venue, locale);
  const record = venue as unknown as Record<string, unknown>;
  const name = lf(record, "name", locale);
  const desc = lf(record, "shortDescription", locale);
  const content = (
    <>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-fsa-pale-bg">
        {venue.heroImageUrl && <Image src={venue.heroImageUrl} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />}
        {/* The title sits ~33% up the card, and with `via-transparent` at the
            midpoint the old from-black/60 scrim had decayed to ~21% by then —
            measured 2.38:1 against a bright patch of the seeded photo, under
            the 3:1 large-text minimum. Holding 30% at the midpoint keeps the
            whole text band legible over any uploaded image (worst case, a pure
            white photo: 3.6:1 on the title, 6.3:1 on the wilaya line) while
            leaving the top of the photo essentially untouched. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="font-fsa-display text-2xl font-bold uppercase text-white" dir="auto">{name}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-white/85"><MapPin className="h-3.5 w-3.5" /> <span dir="auto">{wilaya}</span></p>
        </div>
      </div>
      {desc && (
        <div className="flex items-center justify-between p-5">
          <p className="line-clamp-2 text-sm text-fsa-text-muted" dir="auto">{desc}</p>
        </div>
      )}
    </>
  );

  if (!venue.slug) {
    return <div className="overflow-hidden rounded-fsa-lg border border-fsa-border bg-white shadow-fsa-card">{content}</div>;
  }

  return (
    <Link href={`/${locale}/venues/${venue.slug}`} className="group flex flex-col overflow-hidden rounded-fsa-lg border border-fsa-border bg-white shadow-fsa-card transition-shadow hover:shadow-lg">
      {content}
      <div className="flex items-center justify-end px-5 pb-5">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-fsa-navy-900">
          {t("viewVenue")} <ArrowRight className="ob-flip-rtl h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
