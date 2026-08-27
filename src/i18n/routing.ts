import { defineRouting } from "next-intl/routing";

/**
 * Public site locales. French and Arabic only.
 *
 * English used to be here under the segment "eng" (not "en" — the URL spelling
 * and the i18next code deliberately differed). It is gone: no /eng route, no
 * English entry in the switcher, no English public message bundle.
 *
 * Note this is *only* the public site. The back-office still offers English
 * via i18next (src/i18n.ts, public/locales/en/*), which is a separate store
 * with a separate switcher variant and is unaffected by this list.
 */
export const routing = defineRouting({
  locales: ["fr", "ar"],
  defaultLocale: "fr",

  // Every locale carries its prefix, including the default. "/" is handled by
  // src/app/page.tsx, which redirects to /fr — keeping the canonical URL for
  // French content unambiguous rather than serving it from both "/" and "/fr".
  localePrefix: "always",

  // Persist the visitor's choice. next-intl writes NEXT_LOCALE on every
  // localised navigation and reads it back before falling through to
  // accept-language, so a returning visitor lands on the locale they picked.
  localeCookie: {
    name: "NEXT_LOCALE",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  },

  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];

/** Right-to-left locales. Single source of truth for `dir` decisions. */
const RTL_LOCALES = new Set<string>(["ar"]);

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.has(locale);
}

export function dirFor(locale: string): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}

/**
 * BCP-47 tag handed to `Intl`. Not the same as the routing segment:
 *
 *  - fr → fr-DZ    Algerian French conventions (spacing, currency placement).
 *  - ar → ar-DZ-u-nu-latn
 *
 * The `-u-nu-latn` extension is the important part. Plain `ar-DZ` renders
 * Eastern Arabic digits (١٢٣); Algeria reads Western digits (123) in prices,
 * dates and phone numbers, so the numbering system is pinned explicitly.
 */
const INTL_LOCALES: Record<string, string> = {
  fr: "fr-DZ",
  ar: "ar-DZ-u-nu-latn",
};

export function intlLocale(locale: string): string {
  return INTL_LOCALES[locale] ?? INTL_LOCALES.fr;
}
