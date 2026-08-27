import { intlLocale } from "@/i18n/routing";

/**
 * Locale-aware formatting for the public site.
 *
 * The site used to hardcode `toLocaleDateString("en-GB")` for dates and
 * `toLocaleString("fr-DZ")` for money, so an Arabic page showed "12 February
 * 2026" in English regardless of locale, and bare `toLocaleString()` calls
 * resolved against whatever locale the *server* happened to run in.
 *
 * Everything here routes through `intlLocale()`, which maps fr → fr-DZ and
 * ar → ar-DZ-u-nu-latn (Western digits — Algeria does not read ١٢٣ in prices).
 */

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function memo<T extends Intl.NumberFormat | Intl.DateTimeFormat>(key: string, make: () => T): T {
  let f = cache.get(key) as T | undefined;
  if (!f) {
    f = make();
    cache.set(key, f);
  }
  return f;
}

/** "12 février 2026" / "12 فيفري 2026" */
export function formatDate(value: Date | string | number | null | undefined, locale: string): string {
  if (value == null) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const loc = intlLocale(locale);
  return memo(`d:long:${loc}`, () =>
    new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric" })
  ).format(d);
}

/** "12/02/2026" — the compact form the schedule table uses. */
export function formatDateShort(value: Date | string | number | null | undefined, locale: string): string {
  if (value == null) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const loc = intlLocale(locale);
  return memo(`d:short:${loc}`, () =>
    new Intl.DateTimeFormat(loc, { day: "2-digit", month: "2-digit", year: "numeric" })
  ).format(d);
}

/** Plain grouped number, no currency. */
export function formatNumber(value: number | null | undefined, locale: string): string {
  if (value == null || Number.isNaN(value)) return "";
  const loc = intlLocale(locale);
  return memo(`n:${loc}`, () => new Intl.NumberFormat(loc)).format(value);
}

/**
 * Algerian dinar, written the way the site has always written it — grouped
 * number followed by the currency word — rather than Intl's own DZD output,
 * which renders "DZD 4 000" and would change the visual design.
 */
export function formatPrice(value: number | null | undefined, locale: string, currencyLabel: string): string {
  if (value == null || Number.isNaN(value)) return "";
  return `${formatNumber(value, locale)} ${currencyLabel}`;
}
