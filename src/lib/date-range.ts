/**
 * Calendar-date ranges for finance filters. Client-safe: no imports.
 *
 * Dates travel as "YYYY-MM-DD". `new Date("2026-09-31")` silently rolls over
 * to 1 October, which is how a "31/09/2026" start date was accepted before; a
 * date is only valid here if it survives the round trip.
 */

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The UTC midnight of a real calendar day, or null for anything else. */
export function parseDay(value: string): Date | null {
  const m = ISO_DAY.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Turns optional from/to days into a Prisma range. `to` covers its whole day —
 * a payroll paid this afternoon has a time, and `lte: <midnight>` dropped it
 * from a range ending today. Either bound may be absent ("all time").
 */
export function parseDayRange(
  from: string | null | undefined,
  to: string | null | undefined,
): { range: { gte?: Date; lte?: Date } } | { error: string } {
  const range: { gte?: Date; lte?: Date } = {};
  if (from) {
    const d = parseDay(from);
    if (!d) return { error: "Invalid start date" };
    range.gte = d;
  }
  if (to) {
    const d = parseDay(to);
    if (!d) return { error: "Invalid end date" };
    range.lte = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
  }
  if (range.gte && range.lte && range.gte > range.lte) return { error: "Start date is after end date" };
  return { range };
}

export type PeriodPreset = "season" | "all" | "this_month" | "last_month" | "this_year" | "custom";

/** A sports season as recurring month-days, e.g. { start: "09-01", end: "06-30" }. */
export type SeasonBounds = { start: string; end: string };

export const DEFAULT_SEASON: SeasonBounds = { start: "09-01", end: "06-30" };

const MONTH_DAY = /^(\d{2})-(\d{2})$/;

/** True for a real month-day; 02-29 is allowed (it exists in leap years). */
export function isMonthDay(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = MONTH_DAY.exec(value);
  return !!m && parseDay(`2024-${m[1]}-${m[2]}`) !== null;
}

/**
 * The season containing `today`. A season whose end month-day falls before its
 * start (September → June) runs into the next year; otherwise it sits within
 * one calendar year. 02-29 in a non-leap year resolves to 02-28.
 */
export function currentSeason(today: Date, season: SeasonBounds): { from: string; to: string } {
  const at = (year: number, md: string) => {
    const [mm, dd] = md.split("-").map(Number);
    const last = new Date(Date.UTC(year, mm, 0)).getUTCDate();
    return toDay(new Date(Date.UTC(year, mm - 1, Math.min(dd, last))));
  };
  const y = today.getFullYear();
  const todayStr = toDay(new Date(Date.UTC(y, today.getMonth(), today.getDate())));
  const wraps = season.end < season.start;
  if (!wraps) return { from: at(y, season.start), to: at(y, season.end) };
  return todayStr >= at(y, season.start)
    ? { from: at(y, season.start), to: at(y + 1, season.end) }
    : { from: at(y - 1, season.start), to: at(y, season.end) };
}

/**
 * The days a preset covers, as of `today`. "all" has no bounds; "custom" is
 * whatever the user typed and is not resolved here.
 */
export function presetDays(
  preset: Exclude<PeriodPreset, "custom">,
  today: Date,
  season: SeasonBounds = DEFAULT_SEASON,
): { from: string | null; to: string | null } {
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = (yy: number, mm: number, dd: number) => toDay(new Date(Date.UTC(yy, mm, dd)));
  const todayStr = day(y, m, today.getDate());
  switch (preset) {
    case "all":
      return { from: null, to: null };
    case "this_month":
      return { from: day(y, m, 1), to: todayStr };
    case "last_month":
      return { from: day(y, m - 1, 1), to: day(y, m, 0) };
    case "this_year":
      return { from: day(y, 0, 1), to: todayStr };
    case "season":
      return currentSeason(today, season);
  }
}
