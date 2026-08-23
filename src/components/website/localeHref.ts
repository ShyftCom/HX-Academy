import { routing } from "@/i18n/routing";

/**
 * Sections that exist only under src/app/[locale]/. A link to one of these
 * without a locale prefix has no route at all and 404s — /programmes is not a
 * page, only /fr/programmes is.
 *
 * Keep in step with the directories under src/app/[locale]/. Everything not
 * listed here is either a genuine top-level route (/login, /dashboard) or
 * external, and must be left exactly as authored.
 *
 * "apply" joined this set when the application form moved under [locale]. The
 * bare /apply still resolves — it redirects — but prefixing here means the CTA
 * keeps the visitor in their locale without an extra hop.
 */
const LOCALISED_SECTIONS = new Set([
  "apply",
  "programmes",
  "venues",
  "squads",
  "news",
  "contact",
  "who-we-are",
  "methodology",
  "pathway",
  "store",
  "reviews",
  "summer-camp",
]);

/**
 * Resolve a nav URL authored in the admin (Header/Footer config) against the
 * locale currently being viewed.
 *
 * Admins type paths like "/programmes" — the natural thing to write, and what
 * the seed data used — but the public site is served from /[locale]/..., so
 * those links dropped the visitor onto a 404. Prefixing happens here, at render
 * time, rather than being baked into the stored value, because the stored value
 * is shared across all three locales.
 *
 * Left untouched: external URLs, protocol-relative URLs, anchors, query-only
 * links, paths that already start with a locale, and top-level routes.
 */
export function localeHref(url: string | null | undefined, locale: string): string {
  if (!url) return "#";
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(url)) return url;
  if (!url.startsWith("/")) return url;

  // Strip any query or fragment first: "/contact#safeguarding" must still be
  // recognised as the contact section, or it silently stays unprefixed.
  const pathOnly = url.split(/[?#]/)[0];
  const first = pathOnly.split("/")[1] ?? "";
  if ((routing.locales as readonly string[]).includes(first)) return url;
  if (!LOCALISED_SECTIONS.has(first)) return url;

  return `/${locale}${url}`;
}
