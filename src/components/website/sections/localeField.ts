/** Reads a `{base}`/`{base}Fr`/`{base}Ar` trio out of a section-content JSON
 *  object, matching the field/fieldFr/fieldAr convention used throughout the
 *  Prisma schema (HeaderNavItem.label/labelFr/labelAr, etc). */
export function lf(obj: Record<string, unknown> | undefined | null, base: string, locale: string): string {
  if (!obj) return "";
  const ar = obj[`${base}Ar`];
  const fr = obj[`${base}Fr`];
  if (locale === "ar" && typeof ar === "string" && ar) return ar;
  if (locale === "fr" && typeof fr === "string" && fr) return fr;
  const val = obj[base];
  return typeof val === "string" ? val : "";
}
