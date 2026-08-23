import { routing, type Locale } from "@/i18n/routing";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://footballskillsacademy.com";
}

/**
 * Canonical + hreflang alternates for one public page.
 *
 * `path` is the locale-agnostic part of the route, leading slash, no locale
 * prefix — "" for the homepage, "/programmes", "/news/some-slug".
 *
 * Every public page needs this. Search engines otherwise treat /fr/programmes
 * and /ar/programmes as unrelated documents rather than translations of each
 * other, and neither gets the other's ranking signals. `x-default` points at
 * French: it is the default locale and what "/" redirects to.
 */
export function localeAlternates(locale: string, path = "") {
  const base = siteUrl();
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${base}/${l}${path}`;
  }
  languages["x-default"] = `${base}/${routing.defaultLocale}${path}`;

  return {
    canonical: `${base}/${locale}${path}`,
    languages,
  };
}

/**
 * Choose between an admin-authored value and a translated one.
 *
 * metaTitle / metaDescription / breadcrumbLabel are single-column in the
 * schema — there is no metaTitleFr / metaTitleAr — so one stored value has to
 * serve both locales. Whoever types it in the admin is writing it against the
 * site's default locale (French); for any other locale that value is, by
 * construction, the wrong language. So the admin keeps full SEO control over
 * French, and Arabic falls to the translated string rather than rendering
 * French (or, as the seeded rows do, English) in the browser tab.
 *
 * This is a workaround for a schema gap, not a design: see the migration notes
 * for the list of fields that want a per-locale column.
 */
export function adminOrTranslated(
  adminValue: string | null | undefined,
  translated: string,
  locale: string
): string {
  if (locale === routing.defaultLocale && adminValue) return adminValue;
  return translated || adminValue || "";
}

/** OpenGraph locale tags. `og:locale` for the current page, `og:locale:alternate` for the rest. */
export function openGraphLocale(locale: string) {
  const OG: Record<string, string> = { fr: "fr_DZ", ar: "ar_DZ" };
  return {
    locale: OG[locale] ?? OG.fr,
    alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG[l]),
  };
}

/**
 * The whole metadata block a public page needs: localised title/description,
 * canonical, hreflang, and OpenGraph. Pages pass copy already resolved through
 * next-intl (or through the DB for editable content).
 */
export function pageMetadata(opts: {
  locale: string;
  path?: string;
  title: string;
  description?: string;
  images?: string[];
  noindex?: boolean;
  nofollow?: boolean;
}) {
  const { locale, path = "", title, description, images, noindex, nofollow } = opts;
  const alternates = localeAlternates(locale, path);
  const og = openGraphLocale(locale);

  return {
    title,
    ...(description ? { description } : {}),
    alternates,
    openGraph: {
      title,
      ...(description ? { description } : {}),
      url: alternates.canonical,
      type: "website" as const,
      locale: og.locale,
      alternateLocale: og.alternateLocale,
      ...(images?.length ? { images } : {}),
    },
    ...(noindex ? { robots: { index: false, follow: !nofollow } } : {}),
  };
}

export type { Locale };
