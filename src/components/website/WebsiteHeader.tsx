"use client";

import { useEffect, useState, useRef, useId, useCallback } from "react";
import Link from "next/link";
import { Menu, X, ShoppingCart, ChevronDown, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { localeHref } from "./localeHref";
import { useHeaderOverlay } from "./HeaderOverlayContext";
import { FsaButton } from "./buttons/FsaButton";

interface DropdownItem { id: string; label: string; labelFr: string | null; labelAr: string | null; url: string; icon: string | null; description: string | null; descriptionFr: string | null; descriptionAr: string | null; position: number; isActive: boolean }
interface NavItem { id: string; label: string; labelFr: string | null; labelAr: string | null; url: string | null; hasDropdown: boolean; isActive: boolean; position: number; dropdownItems: DropdownItem[] }
interface HeaderConfig {
  logoUrl: string | null; backgroundColor: string; textColor: string; accentColor: string;
  sticky: boolean; showLanguageSwitcher: boolean;
  ctaLabel: string | null; ctaLabelFr: string | null; ctaLabelAr: string | null;
  ctaUrl: string | null; ctaStyle: string;
  navItems: NavItem[];
}
interface Venue { id: string; slug: string | null; name: string; nameFr?: string | null; nameAr?: string | null; wilaya: string; wilayaFr?: string | null; wilayaAr?: string | null }

function getLabel(item: { label: string; labelFr?: string | null; labelAr?: string | null }, locale: string): string {
  if (locale === "ar" && item.labelAr) return item.labelAr;
  if (locale === "fr" && item.labelFr) return item.labelFr;
  // Arabic falls back to French rather than to the English base column.
  if (locale === "ar" && item.labelFr) return item.labelFr;
  return item.label;
}

/** Same ar -> fr -> base resolution for a location's name. */
function venueName(v: Venue, locale: string): string {
  if (locale === "ar") return v.nameAr || v.nameFr || v.name;
  if (locale === "fr") return v.nameFr || v.name;
  return v.name;
}

/** The province, already resolved to both languages by /api/public/venues. */
function venueWilaya(v: Venue, locale: string): string {
  if (locale === "ar") return v.wilayaAr || v.wilayaFr || v.wilaya;
  return v.wilayaFr || v.wilaya;
}

/** Same resolution for the dropdown blurb. This used to render `d.description`
 *  raw, ignoring descriptionFr/descriptionAr entirely — a guaranteed English
 *  leak in the nav for every locale. */
function getDescription(item: { description: string | null; descriptionFr: string | null; descriptionAr: string | null }, locale: string): string | null {
  if (locale === "ar" && item.descriptionAr) return item.descriptionAr;
  if (locale === "fr" && item.descriptionFr) return item.descriptionFr;
  if (locale === "ar" && item.descriptionFr) return item.descriptionFr;
  return item.description;
}

function getCtaLabel(config: HeaderConfig, locale: string, fallback: string): string {
  if (locale === "ar" && config.ctaLabelAr) return config.ctaLabelAr;
  if (locale === "fr" && config.ctaLabelFr) return config.ctaLabelFr;
  if (locale === "ar" && config.ctaLabelFr) return config.ctaLabelFr;
  return config.ctaLabel ?? fallback;
}

function useCartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => {
      try {
        const cart = JSON.parse(localStorage.getItem("hx_cart") ?? "[]");
        setCount(cart.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0));
      } catch {}
    };
    update();
    window.addEventListener("cartUpdate", update);
    return () => window.removeEventListener("cartUpdate", update);
  }, []);
  return count;
}

/** Disclosure-pattern dropdown (button + region, not a full ARIA menu) — the
 *  simpler, more robust pattern for a set of plain links. Opens on click or
 *  hover, closes on Escape/outside-click/blur-out, no layout shift. */
function NavDropdown({ item, locale, dark }: { item: NavItem; locale: string; dark: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const items = item.dropdownItems.filter((d) => d.isActive).sort((a, b) => a.position - b.position);
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const delayedClose = () => { closeTimer.current = setTimeout(() => setOpen(false), 150); };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={delayedClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-[15px] font-medium transition-colors ${dark ? "text-white hover:bg-white/10" : "text-fsa-navy-900 hover:bg-fsa-navy-900/5"}`}
      >
        {getLabel(item, locale)}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && items.length > 0 && (
        <div
          id={panelId}
          role="region"
          aria-label={getLabel(item, locale)}
          onMouseEnter={cancelClose}
          onMouseLeave={delayedClose}
          className="absolute top-full start-0 z-50 mt-2 min-w-[240px] overflow-hidden rounded-2xl border border-fsa-border bg-white py-2 shadow-[0_20px_50px_rgba(27,19,21,0.20)]"
        >
          {items.map((d) => (
            <Link
              key={d.id}
              href={localeHref(d.url, locale)}
              onClick={() => setOpen(false)}
              className="block px-5 py-3 text-[15px] font-semibold text-fsa-navy-900 transition-colors hover:bg-fsa-pale-bg focus-visible:bg-fsa-pale-bg focus-visible:outline-none"
            >
              {getLabel(d, locale)}
              {getDescription(d, locale) && <span className="mt-0.5 block text-xs font-normal text-fsa-text-muted">{getDescription(d, locale)}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationSelector({ locale, dark }: { locale: string; dark: boolean }) {
  const t = useTranslations("nav");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/public/venues").then((r) => r.json()).then((d) => Array.isArray(d) && setVenues(d)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (venues.length === 0) return null;

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-fsa-pill border px-4 py-1.5 text-sm font-semibold transition-colors ${dark ? "border-white/40 text-white hover:bg-white/10" : "border-fsa-navy-900/20 text-fsa-navy-900 hover:bg-fsa-navy-900/5"}`}
      >
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        {venues.length === 1 ? venueName(venues[0], locale) : t("locations")}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute start-0 top-full z-50 mt-2 max-h-80 min-w-[220px] overflow-auto rounded-2xl border border-fsa-border bg-white py-2 shadow-[0_20px_50px_rgba(27,19,21,0.20)]">
          {venues.map((v) => (
            <Link
              key={v.id}
              href={`/${locale}/venues${v.slug ? `/${v.slug}` : ""}`}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-fsa-navy-900 hover:bg-fsa-pale-bg"
            >
              <span dir="auto">{venueName(v, locale)}</span>
              <span className="ms-1.5 text-xs font-normal text-fsa-text-muted" dir="auto">{venueWilaya(v, locale)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenu({ config, locale, onClose }: { config: HeaderConfig; locale: string; onClose: () => void }) {
  const t = useTranslations();
  const panelRef = useRef<HTMLDivElement>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const navItems = [...(config.navItems ?? [])].sort((a, b) => a.position - b.position).filter((i) => i.isActive);
  const ctaLabel = getCtaLabel(config, locale, t("nav.bookNow"));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])');
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={t("a11y.siteNavigation")}>
      <div className="absolute inset-0 bg-fsa-navy-900/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        className="absolute top-0 end-0 flex h-full w-[86%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-[var(--ease-fsa-standard)]"
      >
        <div className="flex items-center justify-between border-b border-fsa-border px-5 py-4">
          <span className="font-fsa-display text-lg font-bold uppercase text-fsa-navy-900">{t("nav.menu")}</span>
          <button type="button" onClick={onClose} aria-label={t("a11y.closeMenu")} className="flex h-9 w-9 items-center justify-center rounded-lg text-fsa-navy-900 hover:bg-fsa-pale-bg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {navItems.map((item) => (
            <div key={item.id} className="border-b border-fsa-border/60 last:border-none">
              {item.hasDropdown ? (
                <>
                  <button
                    type="button"
                    aria-expanded={openSub === item.id}
                    onClick={() => setOpenSub(openSub === item.id ? null : item.id)}
                    className="flex w-full items-center justify-between px-3 py-3.5 text-[15px] font-semibold text-fsa-navy-900"
                  >
                    {getLabel(item, locale)}
                    <ChevronDown className={`h-4 w-4 transition-transform ${openSub === item.id ? "rotate-180" : ""}`} />
                  </button>
                  {openSub === item.id && (
                    <div className="pb-2 ps-3">
                      {item.dropdownItems.filter((d) => d.isActive).sort((a, b) => a.position - b.position).map((d) => (
                        <Link key={d.id} href={localeHref(d.url, locale)} onClick={onClose} className="block rounded-lg px-3 py-2.5 text-sm text-fsa-text-muted hover:bg-fsa-pale-bg hover:text-fsa-navy-900">
                          {getLabel(d, locale)}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link href={localeHref(item.url, locale)} onClick={onClose} className="block px-3 py-3.5 text-[15px] font-semibold text-fsa-navy-900">
                  {getLabel(item, locale)}
                </Link>
              )}
            </div>
          ))}
        </nav>
        <div className="border-t border-fsa-border p-4">
          {config.ctaUrl && ctaLabel && (
            <FsaButton href={localeHref(config.ctaUrl, locale)} variant="navy" className="w-full">
              {ctaLabel}
            </FsaButton>
          )}
        </div>
      </div>
    </div>
  );
}

export function WebsiteHeader({ locale, stationId }: { locale: string; stationId?: string }) {
  const t = useTranslations();
  const [config, setConfig] = useState<HeaderConfig | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const cartCount = useCartCount();
  const { overlay } = useHeaderOverlay();

  useEffect(() => {
    const url = stationId ? `/api/website/header?station_id=${stationId}` : "/api/website/header";
    fetch(url).then((r) => r.json()).then((d) => { if (d.id) setConfig(d); }).catch(() => {});
  }, [stationId]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  if (!config) return null;

  const transparentPhase = overlay && !scrolled;
  const navItems = [...(config.navItems ?? [])].sort((a, b) => a.position - b.position).filter((i) => i.isActive);
  const ctaLabel = getCtaLabel(config, locale, t("nav.bookNow"));

  const bg = transparentPhase ? "transparent" : config.backgroundColor || "#ffffff";
  const dark = transparentPhase; // "dark" = header sits on a dark hero, so header text/icons are white

  return (
    <>
      <header
        className="inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300"
        style={{
          position: overlay ? "fixed" : config.sticky ? "sticky" : "static",
          backgroundColor: bg,
          borderBottom: !transparentPhase ? "1px solid var(--color-fsa-border)" : "1px solid transparent",
          boxShadow: scrolled && !transparentPhase ? "var(--shadow-fsa-header)" : "none",
        }}
      >
        <div className="mx-auto flex h-20 items-center justify-between gap-4 px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
          {/* Logo */}
          <Link href={`/${locale}`} className="shrink-0">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={t("a11y.logoAlt")} className="h-10 object-contain" />
            ) : (
              <span className={`font-fsa-display text-xl font-extrabold uppercase tracking-tight ${dark ? "text-white" : "text-fsa-navy-900"}`}>
                {t("common.brand")}
              </span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) =>
              item.hasDropdown ? (
                <NavDropdown key={item.id} item={item} locale={locale} dark={dark} />
              ) : (
                <Link
                  key={item.id}
                  href={localeHref(item.url, locale)}
                  className={`rounded-lg px-3 py-2 text-[15px] font-medium transition-colors ${dark ? "text-white hover:bg-white/10" : "text-fsa-navy-900 hover:bg-fsa-navy-900/5"}`}
                >
                  {getLabel(item, locale)}
                </Link>
              )
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2.5">
            <LocationSelector locale={locale} dark={dark} />
            {config.showLanguageSwitcher && <LanguageSwitcher variant="public" onDark={dark} />}

            <Link
              href={`/${locale}/store/cart`}
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${dark ? "text-white hover:bg-white/10" : "text-fsa-navy-900 hover:bg-fsa-navy-900/5"}`}
              aria-label={t("a11y.cart")}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -end-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fsa-error text-[10px] font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>

            {config.ctaUrl && ctaLabel && (
              <FsaButton href={localeHref(config.ctaUrl, locale)} variant="sky" size="sm" className="hidden md:inline-flex">
                {ctaLabel}
              </FsaButton>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
              aria-label={t("a11y.openMenu")}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors lg:hidden ${dark ? "text-white hover:bg-white/10" : "text-fsa-navy-900 hover:bg-fsa-navy-900/5"}`}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && <MobileMenu config={config} locale={locale} onClose={closeMobile} />}
    </>
  );
}
