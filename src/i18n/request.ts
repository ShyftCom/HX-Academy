import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Public-site messages live in messages/site/<locale>.json — deliberately
 * separate from messages/{fr,eng,ar}.json.
 *
 * Those flat bundles are *also* imported by src/i18n.ts as the back-office's
 * i18next "common" namespace, so restructuring them to suit the public site
 * would silently reshape the admin. Splitting the stores means the public tree
 * can be organised per-page (and carry Arabic parity) without the admin being
 * able to notice.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as never)) {
    locale = routing.defaultLocale;
  }

  const messages = (await import(`../../messages/site/${locale}.json`)).default;

  // Arabic falls back to French, never English. A key not yet translated shows
  // French copy — wrong language, but still a language this audience reads,
  // and never the English the public site is supposed to have shed.
  if (locale !== routing.defaultLocale) {
    const fallback = (await import(`../../messages/site/${routing.defaultLocale}.json`)).default;
    return { locale, messages: deepMerge(fallback, messages) };
  }

  return { locale, messages };
});

type Json = Record<string, unknown>;

/** Deep merge; `override` wins where it supplies a non-empty value. */
function deepMerge(base: Json, override: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(override)) {
    const existing = out[k];
    if (v && typeof v === "object" && !Array.isArray(v) && existing && typeof existing === "object" && !Array.isArray(existing)) {
      out[k] = deepMerge(existing as Json, v as Json);
    } else if (v !== "" && v != null) {
      out[k] = v;
    }
  }
  return out;
}
