"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUp, Star, CheckCircle2 } from "lucide-react";
import { FsaButton } from "./buttons/FsaButton";

interface FooterLink { id: string; label: string; labelFr: string | null; labelAr: string | null; url: string; openInNewTab: boolean }
interface FooterColumn { id: string; title: string; titleFr: string | null; titleAr: string | null; position: number; links: FooterLink[] }
interface SocialLink { id: string; platform: string; url: string }
interface BottomLink { id: string; label: string; labelFr: string | null; labelAr: string | null; url: string }
interface FooterConfig {
  backgroundColor: string; textColor: string; accentColor: string;
  logoUrl: string | null; tagline: string | null; taglineFr: string | null; taglineAr: string | null;
  copyrightText: string; showTrustpilot: boolean; trustpilotUrl: string | null;
  linkColumns: FooterColumn[]; socialLinks: SocialLink[]; bottomLinks: BottomLink[];
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  facebook: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>,
  instagram: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>,
  youtube: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>,
  tiktok: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.52V6.79a4.85 4.85 0 01-1.02-.1z"/></svg>,
  x: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  linkedin: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>,
  whatsapp: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  snapchat: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.206 1c-.935 0-4.188.35-4.188 4.375v.72C7.36 6.04 6.556 6.4 6.556 6.4S5.5 8.21 5.5 9.5c0 1 .5 2.056.5 2.056S5 12 5 13c0 2 2 3 2 3s.06.5-.4 1c-.46.5-2.1.844-2.1 1.5 0 .75.9 1 .9 1s.5 1 3.6 1.5c.3.05.4.2.4.4 0 .35.24.6.6.6h4c.36 0 .6-.25.6-.6 0-.2.1-.35.4-.4 3.1-.5 3.6-1.5 3.6-1.5s.9-.25.9-1c0-.656-1.64-1-2.1-1.5-.46-.5-.4-1-.4-1s2-1 2-3c0-1-.5-1.444-.5-1.444S18 10.5 18 9.5c0-1.29-1.056-3.1-1.056-3.1s-.804-.36-1.462-.305v-.72C15.482 1.35 13.141 1 12.206 1"/></svg>,
};

function getLabel(item: { label: string; labelFr: string | null; labelAr: string | null }, locale: string): string {
  if (locale === "ar" && item.labelAr) return item.labelAr;
  if (locale === "fr" && item.labelFr) return item.labelFr;
  return item.label;
}
function getTitle(col: FooterColumn, locale: string): string {
  if (locale === "ar" && col.titleAr) return col.titleAr;
  if (locale === "fr" && col.titleFr) return col.titleFr;
  return col.title;
}
function getTagline(config: FooterConfig, locale: string): string | null {
  if (locale === "ar" && config.taglineAr) return config.taglineAr;
  if (locale === "fr" && config.taglineFr) return config.taglineFr;
  return config.tagline;
}

const COPY: Record<string, { newsletterTitle: string; newsletterBody: string; emailPlaceholder: string; subscribe: string; subscribed: string; backToTop: string }> = {
  eng: { newsletterTitle: "Stay in the loop", newsletterBody: "Programme updates, trial dates and academy news — straight to your inbox.", emailPlaceholder: "Your email address", subscribe: "Subscribe", subscribed: "You're subscribed", backToTop: "Back to top" },
  fr: { newsletterTitle: "Restez informé", newsletterBody: "Programmes, dates d'essais et actualités de l'académie, directement dans votre boîte mail.", emailPlaceholder: "Votre adresse e-mail", subscribe: "S'inscrire", subscribed: "Inscription confirmée", backToTop: "Haut de page" },
  ar: { newsletterTitle: "ابقَ على اطلاع", newsletterBody: "تحديثات البرامج ومواعيد التجارب وأخبار الأكاديمية مباشرة إلى بريدك.", emailPlaceholder: "بريدك الإلكتروني", subscribe: "اشترك", subscribed: "تم الاشتراك", backToTop: "العودة إلى الأعلى" },
};

function NewsletterForm({ locale, textColor }: { locale: string; textColor: string }) {
  const t = COPY[locale] ?? COPY.eng;
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/public/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 rounded-fsa-pill bg-white/10 px-4 py-3 text-sm font-medium" style={{ color: textColor }}>
        <CheckCircle2 className="h-4 w-4 text-fsa-sky" /> {t.subscribed}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
      {/* Honeypot — hidden from real users, bots tend to fill every field */}
      <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.emailPlaceholder}
        className="h-11 min-w-0 flex-1 rounded-fsa-pill border border-white/20 bg-white/10 px-4 text-sm text-white placeholder:text-white/50 focus:border-fsa-sky focus:outline-none"
      />
      <FsaButton type="submit" variant="sky" size="sm" icon={false} loading={status === "loading"} disabled={status === "loading"}>
        {t.subscribe}
      </FsaButton>
    </form>
  );
}

export function WebsiteFooter({ locale, stationId }: { locale: string; stationId?: string }) {
  const [config, setConfig] = useState<FooterConfig | null>(null);

  useEffect(() => {
    const url = stationId ? `/api/website/footer?station_id=${stationId}` : "/api/website/footer";
    fetch(url).then((r) => r.json()).then((d) => { if (d.id) setConfig(d); }).catch(() => {});
  }, [stationId]);

  if (!config) return null;

  const isRtl = locale === "ar";
  const bg = config.backgroundColor || "#001F49";
  const text = config.textColor || "#ffffff";
  const accent = config.accentColor || "#43C7ED";
  const columns = [...(config.linkColumns ?? [])].sort((a, b) => a.position - b.position);
  const socials = config.socialLinks?.filter((s) => s.url);
  const tagline = getTagline(config, locale);
  const t = COPY[locale] ?? COPY.eng;

  return (
    <footer style={{ backgroundColor: bg, color: text }} dir={isRtl ? "rtl" : "ltr"}>
      {/* Newsletter band */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex flex-col items-start justify-between gap-6 px-[var(--fsa-container-pad)] py-10 lg:flex-row lg:items-center" style={{ maxWidth: "var(--fsa-container-max)" }}>
          <div>
            {/* text-current is required, not cosmetic: globals.css sets a colour
                on h1-h6 directly, which beats the colour inherited from <footer>.
                Without it this heading renders in the admin text colour. */}
            <h3 className="font-fsa-display text-2xl font-bold uppercase tracking-tight text-current">{t.newsletterTitle}</h3>
            <p className="mt-1 max-w-md text-sm" style={{ color: text, opacity: 0.75 }}>{t.newsletterBody}</p>
          </div>
          <NewsletterForm locale={locale} textColor={text} />
        </div>
      </div>

      <div className="mx-auto px-[var(--fsa-container-pad)] py-12" style={{ maxWidth: "var(--fsa-container-max)" }}>
        {/* Top: logo + tagline + socials */}
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className={isRtl ? "md:order-last" : ""}>
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="Football Skills Academy" className="mb-3 h-10 object-contain" />
            ) : (
              <div className="mb-3 font-fsa-display text-xl font-extrabold uppercase tracking-tight" style={{ color: accent }}>
                Football Skills Academy
              </div>
            )}
            {tagline && <p style={{ color: text, opacity: 0.7 }} className="max-w-xs text-sm">{tagline}</p>}
            {config.showTrustpilot && config.trustpilotUrl && (
              <a
                href={config.trustpilotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/20"
                style={{ color: text }}
              >
                <Star className="h-4 w-4 fill-current text-fsa-sky" /> Rated on Trustpilot
              </a>
            )}
          </div>

          {socials && socials.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {socials.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.platform}
                  style={{ backgroundColor: "rgba(255,255,255,0.1)", color: text }}
                  className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/20"
                >
                  {SOCIAL_ICONS[s.platform] ?? <span className="text-xs uppercase">{s.platform.slice(0, 2)}</span>}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Link columns */}
        {columns.length > 0 && (
          <div className="mb-10 grid gap-8" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))` }}>
            {(isRtl ? [...columns].reverse() : columns).map((col) => (
              <div key={col.id}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: accent }}>
                  {getTitle(col, locale)}
                </h3>
                <ul className="space-y-2">
                  {col.links?.map((link) => (
                    <li key={link.id}>
                      <Link
                        href={link.url}
                        target={link.openInNewTab ? "_blank" : undefined}
                        rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                        style={{ color: text, opacity: 0.8 }}
                        className="text-sm transition-opacity hover:opacity-100"
                      >
                        {getLabel(link, locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <div className={`flex flex-wrap gap-4 ${isRtl ? "flex-row-reverse" : ""}`}>
            {config.bottomLinks?.map((l) => (
              <Link key={l.id} href={l.url} style={{ color: text, opacity: 0.6 }} className="text-xs transition-opacity hover:opacity-100">
                {getLabel(l, locale)}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <p style={{ color: text, opacity: 0.5 }} className="text-xs">{config.copyrightText}</p>
            <a
              href="#top"
              style={{ color: text, opacity: 0.6 }}
              className="inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-100"
            >
              <ArrowUp className="h-3.5 w-3.5" /> {t.backToTop}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
