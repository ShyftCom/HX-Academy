/**
 * Reads a `{base}`/`{base}Fr`/`{base}Ar` trio out of a section-content JSON
 * object, matching the field/fieldFr/fieldAr convention used throughout the
 * Prisma schema (HeaderNavItem.label/labelFr/labelAr, etc).
 *
 * The base column holds English — it predates the public site going
 * French/Arabic-only. So the fallback chain deliberately routes Arabic through
 * French before it ever reaches the base value:
 *
 *   ar → Ar, then Fr, then base
 *   fr → Fr, then base
 *
 * Without the middle step, any row an admin translated into French but not yet
 * into Arabic rendered *English* on the Arabic page — the exact thing the
 * public site is supposed to have shed. French is at least a language this
 * audience reads, and it makes an untranslated field look like a translation
 * gap rather than a different site.
 *
 * The base value remains the last resort: it is what a fresh install has
 * before anyone opens the admin, and a blank page would be worse.
 */
export function lf(obj: Record<string, unknown> | undefined | null, base: string, locale: string): string {
  if (!obj) return "";

  const read = (key: string): string => {
    const val = obj[key];
    return typeof val === "string" ? val : "";
  };

  const ar = read(`${base}Ar`);
  const fr = read(`${base}Fr`);

  if (locale === "ar") return ar || fr || read(base);
  if (locale === "fr") return fr || read(base);
  return read(base);
}
