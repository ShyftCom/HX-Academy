import type { Metadata } from "next";
import { Phone, Mail, MapPin, ShieldCheck, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { Hero } from "@/components/website/Hero";
import { Breadcrumb } from "@/components/website/Breadcrumb";
import { FaqAccordion } from "@/components/website/FaqAccordion";
import { ContactForm } from "./ContactForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.contact" });
  return pageMetadata({ locale, path: "/contact", title: t("title"), description: t("description") });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  const tFaq = await getTranslations({ locale, namespace: "faq" });

  const [settings, faqs] = await Promise.all([
    getSettings(["academy_email", "academy_phone", "academy_whatsapp", "academy_address"]),
    db.faq.findMany({ where: { isPublished: true, category: "contact" }, orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <Hero
        desktopImageUrl="https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=1600&q=80"
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        minHeight="50vh"
      />
      <Breadcrumb locale={locale} items={[{ label: t("breadcrumb") }]} />

      <section className="bg-white py-[var(--fsa-section-y)]">
        <div className="mx-auto grid grid-cols-1 gap-12 px-[var(--fsa-container-pad)] lg:grid-cols-3" style={{ maxWidth: "var(--fsa-container-max)" }}>
          <div className="lg:col-span-2">
            <ContactForm />
          </div>

          <aside className="space-y-6">
            <div className="rounded-fsa-md border border-fsa-border p-6">
              <h3 className="font-fsa-display text-lg font-bold uppercase text-fsa-navy-900">{t("getInTouch")}</h3>
              <div className="mt-4 space-y-3 text-sm text-fsa-text">
                {settings.academy_phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-fsa-heading-blue" /> {settings.academy_phone}</p>}
                {settings.academy_email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-fsa-heading-blue" /> {settings.academy_email}</p>}
                {settings.academy_address && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-fsa-heading-blue" /> {settings.academy_address}</p>}
                <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-fsa-heading-blue" /> {t("openingHours")}</p>
              </div>
            </div>

            <div id="safeguarding" className="rounded-fsa-md bg-fsa-pale-bg p-6">
              <h3 className="flex items-center gap-2 font-fsa-display text-lg font-bold uppercase text-fsa-navy-900">
                <ShieldCheck className="h-5 w-5 text-fsa-heading-blue" /> {t("safeguardingTitle")}
              </h3>
              <p className="mt-2 text-sm text-fsa-text-muted">{t("safeguardingBody")}</p>
            </div>
          </aside>
        </div>
      </section>

      {faqs.length > 0 && <FaqAccordion items={faqs} locale={locale} heading={tFaq("heading")} />}
    </>
  );
}
