import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format as dateFnsFormat } from "date-fns";
import * as fmt from "@/lib/format";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// The four helpers below are thin adapters over src/lib/format.ts, which is now
// the single source of truth for how a date / number / dinar is rendered — so a
// chart tooltip, a table cell and a metric card can no longer disagree. They
// keep their original names and signatures because ~60 pages import them; new
// code should import "@/lib/format" directly for the richer options.

/** `pattern` is an explicit date-fns escape hatch used by a few pages that need
 *  a fixed shape (e.g. "yyyy-MM"). Omit it and the user's locale decides. */
export function formatDate(date: Date | string | null | undefined, pattern?: string) {
  if (!date) return "—";
  if (pattern) return dateFnsFormat(new Date(date), pattern);
  return fmt.date(date);
}

export function formatDateTime(date: Date | string | null | undefined) {
  return fmt.dateTime(date);
}

export function timeAgo(date: Date | string | null | undefined) {
  return fmt.relativeTime(date);
}

export function formatCurrency(amount: number | null | undefined, currency = "DZD") {
  return fmt.currency(amount, { currency });
}

export function formatNumber(n: number | null | undefined) {
  return fmt.number(n);
}

export function generateOrderNumber() {
  const prefix = "HX";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function calculateAge(dob: Date | string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== "" && val !== null) {
      qs.set(key, String(val));
    }
  }
  return qs.toString();
}

export function parseJsonSafe<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Legacy status class map. Prefer <StatusBadge status="…" /> — it renders the
 * label in JetBrains Mono with a tinted low-opacity fill and, crucially, does
 * not rely on colour alone to convey state. These class strings are kept for
 * the pages that still interpolate them directly; the Tailwind names resolve
 * to Obsidian tokens through the compatibility layer in globals.css.
 */
export const STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-100 text-green-700",
  inactive:  "bg-gray-100 text-gray-600",
  pending:   "bg-yellow-100 text-yellow-700",
  approved:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  expired:   "bg-red-100 text-red-700",
  suspended: "bg-orange-100 text-orange-700",
  converted: "bg-blue-100 text-blue-700",
};
