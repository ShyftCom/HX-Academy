import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { lf } from "../sections/localeField";

export interface ProgrammeCardData {
  slug: string;
  name: string;
  nameFr?: string | null;
  nameAr?: string | null;
  shortDescription?: string | null;
  shortDescriptionFr?: string | null;
  shortDescriptionAr?: string | null;
  cardImageUrl?: string | null;
  heroImageUrl?: string | null;
  ageRangeLabel?: string | null;
  ageRangeLabelFr?: string | null;
  ageRangeLabelAr?: string | null;
  priceLabel?: string | null;
  priceLabelFr?: string | null;
  priceLabelAr?: string | null;
  isFeatured?: boolean;
  category?: { name: string; nameFr?: string | null; nameAr?: string | null } | null;
}

export async function ProgrammeCard({ programme, locale }: { programme: ProgrammeCardData; locale: string }) {
  const t = await getTranslations({ locale, namespace: "programmes" });
  const name = lf(programme as unknown as Record<string, unknown>, "name", locale);
  const desc = lf(programme as unknown as Record<string, unknown>, "shortDescription", locale);
  const ageRange = lf(programme as unknown as Record<string, unknown>, "ageRangeLabel", locale);
  const price = lf(programme as unknown as Record<string, unknown>, "priceLabel", locale);
  const image = programme.cardImageUrl || programme.heroImageUrl;

  return (
    <Link
      href={`/${locale}/programmes/${programme.slug}`}
      className="group flex flex-col overflow-hidden rounded-fsa-lg border border-fsa-border bg-white shadow-fsa-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-fsa-pale-bg">
        {image && <Image src={image} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />}
        {programme.isFeatured && (
          <span className="absolute start-3 top-3 rounded-fsa-pill bg-fsa-sky px-3 py-1 text-xs font-bold text-fsa-navy-900">{t("featured")}</span>
        )}
        {programme.category && (
          <span className="absolute bottom-3 start-3 rounded-fsa-pill bg-fsa-navy-900/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {lf(programme.category as unknown as Record<string, unknown>, "name", locale)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-fsa-display text-xl font-bold text-fsa-navy-900" dir="auto">{name}</h3>
        {ageRange && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-fsa-heading-blue">{ageRange}</p>}
        {desc && <p className="mt-2 line-clamp-2 flex-1 text-sm text-fsa-text-muted" dir="auto">{desc}</p>}
        <div className="mt-4 flex items-center justify-between border-t border-fsa-border pt-3">
          {price ? <span className="text-sm font-semibold text-fsa-navy-900">{price}</span> : <span />}
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-fsa-navy-900">
            {t("viewDetails")} <ArrowRight className="ob-flip-rtl h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
