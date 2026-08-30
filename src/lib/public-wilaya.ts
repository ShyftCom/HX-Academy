import { cache } from "react";
import { db } from "@/lib/db";

/**
 * Station.wilaya is free text an operator typed ("Algiers", "Alger"), while
 * wilayaCode is the numeric code of that same province — and the Wilaya table
 * already carries every code's French and Arabic name. So the public site
 * labels a location's province from that table rather than printing whatever
 * was typed, which is what put a Latin "Alger" on the Arabic venue cards.
 *
 * Lookup is by code first and by the typed name second: stations created before
 * wilayaCode was collected have only the string, and it usually *is* the French
 * name, so matching it recovers the pair anyway.
 *
 * `cache()` scopes one query to one render, so a page listing every venue still
 * reads the table once.
 */
export interface WilayaNames {
  byCode: Map<number, { fr: string; ar: string }>;
  byName: Map<string, { fr: string; ar: string }>;
}

export const wilayaNames = cache(async (): Promise<WilayaNames> => {
  const empty: WilayaNames = { byCode: new Map(), byName: new Map() };
  try {
    const rows = await db.wilaya.findMany({ select: { code: true, nameFr: true, nameAr: true } });
    const byCode = new Map<number, { fr: string; ar: string }>();
    const byName = new Map<string, { fr: string; ar: string }>();
    for (const r of rows) {
      const pair = { fr: r.nameFr, ar: r.nameAr };
      byCode.set(r.code, pair);
      byName.set(r.nameFr.trim().toLowerCase(), pair);
      byName.set(r.nameAr.trim().toLowerCase(), pair);
    }
    return { byCode, byName };
  } catch {
    // No Wilaya rows (fresh install) is not a reason to drop the label.
    return empty;
  }
});

export function wilayaLabel(
  names: WilayaNames,
  station: { wilaya?: string | null; wilayaCode?: number | null },
  locale: string
): string {
  const typed = station.wilaya ?? "";
  const pair =
    (station.wilayaCode != null ? names.byCode.get(station.wilayaCode) : undefined) ??
    names.byName.get(typed.trim().toLowerCase());
  if (!pair) return typed;
  return locale === "ar" ? pair.ar || pair.fr : pair.fr;
}
