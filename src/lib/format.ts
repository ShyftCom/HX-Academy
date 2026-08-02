/**
 * Centralised locale-aware formatting.
 * ============================================================
 * One place decides how a dinar, a date or a percentage looks, so a
 * revenue chart tooltip, a payments table cell and a dashboard metric
 * can never disagree about "3000 DA" vs "3 000,00 DZD" vs "DZD 3000".
 *
 * Never concatenate a currency symbol by hand — call `currency()`.
 *
 * The app's i18next codes are `fr` | `en` | `ar`; those map to the BCP-47
 * tags below. Algeria is the market, so every locale formats numbers and
 * dates in its Algerian variant.
 */

export type AppLocale = "fr" | "en" | "ar";

const BCP47: Record<AppLocale, string> = {
  fr: "fr-DZ",
  en: "en-DZ",
  ar: "ar-DZ",
};

const DEFAULT_CURRENCY = "DZD";

function resolve(locale?: AppLocale | string): string {
  if (!locale) return BCP47.fr;
  const short = locale.slice(0, 2) as AppLocale;
  return BCP47[short] ?? BCP47.fr;
}

/**
 * Reads the locale the user actually picked. i18next owns that choice at
 * runtime, but these helpers are called from server components and plain
 * modules too, so this degrades to the stored preference and then to `fr`
 * rather than importing i18next and dragging it into every bundle.
 */
export function currentLocale(): AppLocale {
  if (typeof window === "undefined") return "fr";
  const raw = window.localStorage.getItem("shyftcom_lang");
  if (raw === "en" || raw === "eng") return "en";
  if (raw === "ar") return "ar";
  return "fr";
}

/** Formatter instances are expensive; Intl objects are immutable so cache them. */
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
function memo<T extends Intl.NumberFormat | Intl.DateTimeFormat>(key: string, make: () => T): T {
  const hit = cache.get(key);
  if (hit) return hit as T;
  const made = make();
  cache.set(key, made);
  return made;
}

/* ============================================================
   CURRENCY
   ============================================================ */

/**
 * Money, always with its unit. `3000` -> "3 000 DA" (fr) / "DZD 3,000" (en).
 *
 * Zero is a real value and formats as "0 DA" — deliberately not an em dash,
 * so a genuinely-zero balance does not read as missing data. Pass null or
 * undefined for "we don't have this number".
 */
export function currency(
  amount: number | null | undefined,
  opts: { locale?: AppLocale | string; currency?: string; decimals?: boolean } = {}
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  const loc = resolve(opts.locale ?? currentLocale());
  const cur = opts.currency ?? DEFAULT_CURRENCY;
  const frac = opts.decimals ? 2 : 0;
  return memo(`c:${loc}:${cur}:${frac}`, () =>
    new Intl.NumberFormat(loc, {
      style: "currency",
      currency: cur,
      minimumFractionDigits: frac,
      maximumFractionDigits: frac,
    })
  ).format(amount);
}

/**
 * Money for axis ticks and dense cards: "3 000 DA" -> "3 k DA".
 * Keeps the unit so a chart axis is never an unlabelled number.
 */
export function currencyCompact(
  amount: number | null | undefined,
  opts: { locale?: AppLocale | string; currency?: string } = {}
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  const loc = resolve(opts.locale ?? currentLocale());
  const cur = opts.currency ?? DEFAULT_CURRENCY;
  return memo(`cc:${loc}:${cur}`, () =>
    new Intl.NumberFormat(loc, {
      style: "currency",
      currency: cur,
      notation: "compact",
      maximumFractionDigits: 1,
    })
  ).format(amount);
}

/* ============================================================
   NUMBERS
   ============================================================ */

export function number(
  n: number | null | undefined,
  opts: { locale?: AppLocale | string; decimals?: number } = {}
): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const loc = resolve(opts.locale ?? currentLocale());
  const d = opts.decimals ?? 0;
  return memo(`n:${loc}:${d}`, () =>
    new Intl.NumberFormat(loc, { minimumFractionDigits: d, maximumFractionDigits: d })
  ).format(n);
}

/** Large counts in tight spaces: 12400 -> "12,4 k". */
export function numberCompact(n: number | null | undefined, locale?: AppLocale | string): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const loc = resolve(locale ?? currentLocale());
  return memo(`nc:${loc}`, () =>
    new Intl.NumberFormat(loc, { notation: "compact", maximumFractionDigits: 1 })
  ).format(n);
}

/**
 * A percentage that already *is* a percentage (12.5 -> "12,5 %"), not a
 * ratio. `signed` prefixes "+" so a delta reads as a direction, which
 * matters because colour alone must not carry the meaning.
 */
export function percent(
  value: number | null | undefined,
  opts: { locale?: AppLocale | string; decimals?: number; signed?: boolean } = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const loc = resolve(opts.locale ?? currentLocale());
  const d = opts.decimals ?? (Number.isInteger(value) ? 0 : 1);
  const body = memo(`p:${loc}:${d}`, () =>
    new Intl.NumberFormat(loc, { minimumFractionDigits: d, maximumFractionDigits: d })
  ).format(value);
  const sign = opts.signed && value > 0 ? "+" : "";
  return `${sign}${body} %`;
}

/** Which way a delta points. Drives icon + text, never colour alone. */
export type Direction = "up" | "down" | "flat";
export function direction(value: number | null | undefined): Direction {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}

/* ============================================================
   DATES
   ============================================================ */

export function date(
  value: Date | string | number | null | undefined,
  opts: { locale?: AppLocale | string; style?: "short" | "medium" | "long" } = {}
): string {
  const d = toDate(value);
  if (!d) return "—";
  const loc = resolve(opts.locale ?? currentLocale());
  const style = opts.style ?? "medium";
  const cfg: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "2-digit", month: "2-digit", year: "numeric" }
      : style === "long"
        ? { day: "numeric", month: "long", year: "numeric" }
        : { day: "numeric", month: "short", year: "numeric" };
  return memo(`d:${loc}:${style}`, () => new Intl.DateTimeFormat(loc, cfg)).format(d);
}

export function dateTime(
  value: Date | string | number | null | undefined,
  locale?: AppLocale | string
): string {
  const d = toDate(value);
  if (!d) return "—";
  const loc = resolve(locale ?? currentLocale());
  return memo(`dt:${loc}`, () =>
    new Intl.DateTimeFormat(loc, {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  ).format(d);
}

export function time(
  value: Date | string | number | null | undefined,
  locale?: AppLocale | string
): string {
  const d = toDate(value);
  if (!d) return "—";
  const loc = resolve(locale ?? currentLocale());
  return memo(`t:${loc}`, () =>
    new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit" })
  ).format(d);
}

/** "il y a 3 jours" / "3 days ago" — via Intl, so it translates for free. */
export function relativeTime(
  value: Date | string | number | null | undefined,
  locale?: AppLocale | string
): string {
  const d = toDate(value);
  if (!d) return "—";
  const loc = resolve(locale ?? currentLocale());
  const rtf = memo(`rt:${loc}`, () =>
    new Intl.RelativeTimeFormat(loc, { numeric: "auto" }) as unknown as Intl.NumberFormat
  ) as unknown as Intl.RelativeTimeFormat;

  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000], ["month", 2592000], ["week", 604800],
    ["day", 86400], ["hour", 3600], ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (abs >= secs) return rtf.format(Math.round(diffSec / secs), unit);
  }
  return rtf.format(diffSec, "second");
}

/** Month label for chart axes: "Jan 2026". */
export function monthLabel(
  value: Date | string | number | null | undefined,
  locale?: AppLocale | string
): string {
  const d = toDate(value);
  if (!d) return "—";
  const loc = resolve(locale ?? currentLocale());
  return memo(`ml:${loc}`, () =>
    new Intl.DateTimeFormat(loc, { month: "short", year: "numeric" })
  ).format(d);
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ============================================================
   PHONE
   ============================================================ */

/**
 * Algerian mobile/landline grouping: 0551234567 -> "05 51 23 45 67".
 * Left untouched (trimmed only) when it doesn't look like a DZ number, so an
 * international contact is never mangled into a wrong shape.
 */
export function phone(value: string | null | undefined): string {
  if (!value) return "—";
  const raw = value.replace(/[^\d+]/g, "");
  const local = raw.startsWith("+213") ? "0" + raw.slice(4) : raw;
  if (/^0\d{9}$/.test(local)) return local.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  return value.trim();
}

/** Bytes for the file manager: 1536 -> "1,5 KB". */
export function fileSize(bytes: number | null | undefined, locale?: AppLocale | string): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const scaled = bytes / Math.pow(1024, i);
  return `${number(scaled, { locale, decimals: i === 0 ? 0 : 1 })} ${units[i]}`;
}

const format = {
  currency, currencyCompact, number, numberCompact, percent, direction,
  date, dateTime, time, relativeTime, monthLabel, phone, fileSize, currentLocale,
};
export default format;
