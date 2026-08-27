import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, dirFor } from "@/i18n/routing";
import { WebsiteHeader } from "@/components/website/WebsiteHeader";
import { WebsiteFooter } from "@/components/website/WebsiteFooter";
import { ThemeVars } from "@/components/website/design-tokens/ThemeVars";
import { allFontVariables } from "@/components/website/design-tokens/fonts";
import { HeaderOverlayProvider } from "@/components/website/HeaderOverlayContext";
import { OrganizationSchema } from "@/components/website/OrganizationSchema";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Explicit locale, not the ambient requestLocale. getMessages() with no
  // argument resolves through next-intl's request plumbing, which silently
  // falls back to the default locale if anything upstream drops it — and the
  // failure mode is subtle: server components stay correct (they pass locale
  // directly) while every client component renders French on the Arabic page.
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "a11y" });
  const dir = dirFor(locale);

  // Note: the hero slider and sponsor strip used to be mounted globally here,
  // stacking above every page's own content (including this page's own hero).
  // They are now rendered by the homepage itself (src/app/[locale]/page.tsx)
  // only, so new per-page Hero components (Programmes, Venues, etc.) aren't
  // preceded by a redundant homepage-style carousel.
  //
  // `dir` is also set on <html> by the root layout (fed the locale by the
  // proxy). It is repeated on this wrapper because Tailwind's rtl: variant and
  // the [dir="rtl"] rules in globals.css both match on the nearest ancestor
  // that declares it, and keeping it local means the public site stays
  // correct even if the header ever fails to reach the root layout.
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeVars />
      <OrganizationSchema locale={locale} />
      <div
        id="top"
        dir={dir}
        className={`fsa-site ${allFontVariables} ${locale === "ar" ? "font-arabic" : ""}`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-fsa-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          {t("skipToContent")}
        </a>
        <HeaderOverlayProvider>
          <WebsiteHeader locale={locale} />
          <main id="main-content">{children}</main>
          <WebsiteFooter locale={locale} />
        </HeaderOverlayProvider>
      </div>
    </NextIntlClientProvider>
  );
}
