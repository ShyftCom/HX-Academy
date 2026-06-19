import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getMessages } from "next-intl/server";
import { WebsiteHeader } from "@/components/website/WebsiteHeader";
import { WebsiteFooter } from "@/components/website/WebsiteFooter";
import { WebsiteSlider } from "@/components/website/WebsiteSlider";
import { WebsiteSponsors } from "@/components/website/WebsiteSponsors";

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

  return (
    <NextIntlClientProvider messages={messages}>
      <div dir={dir} className={locale === "ar" ? "font-arabic" : ""}>
        <WebsiteHeader locale={locale} />
        <WebsiteSlider locale={locale} />
        {children}
        <WebsiteSponsors locale={locale} />
        <WebsiteFooter locale={locale} />
      </div>
    </NextIntlClientProvider>
  );
}
