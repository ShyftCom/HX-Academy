import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getMessages } from "next-intl/server";
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

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  // Note: the hero slider and sponsor strip used to be mounted globally here,
  // stacking above every page's own content (including this page's own hero).
  // They are now rendered by the homepage itself (src/app/[locale]/page.tsx)
  // only, so new per-page Hero components (Programmes, Venues, etc.) aren't
  // preceded by a redundant homepage-style carousel.
  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeVars />
      <OrganizationSchema locale={locale} />
      <div id="top" dir={dir} className={`fsa-site ${allFontVariables} ${locale === "ar" ? "font-arabic" : ""}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-fsa-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
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
