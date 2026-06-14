"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Menu, X, ShoppingCart, ChevronDown } from "lucide-react";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

interface DropdownItem { id: string; label: string; labelFr: string | null; labelAr: string | null; url: string; icon: string | null; description: string | null; descriptionFr: string | null; descriptionAr: string | null; position: number }
interface NavItem { id: string; label: string; labelFr: string | null; labelAr: string | null; url: string | null; hasDropdown: boolean; isActive: boolean; position: number; dropdownItems: DropdownItem[] }
interface HeaderConfig {
  logoUrl: string | null; backgroundColor: string; textColor: string; accentColor: string;
  sticky: boolean; showLanguageSwitcher: boolean;
  ctaLabel: string | null; ctaLabelFr: string | null; ctaLabelAr: string | null;
  ctaUrl: string | null; ctaStyle: string;
  navItems: NavItem[];
}

function getLabel(item: { label: string; labelFr?: string | null; labelAr?: string | null }, locale: string): string {
  if (locale === "ar" && item.labelAr) return item.labelAr;
  if ((locale === "fr" || locale === "fr") && item.labelFr) return item.labelFr;
  return item.label;
}

function getCtaLabel(config: HeaderConfig, locale: string): string {
  if (locale === "ar" && config.ctaLabelAr) return config.ctaLabelAr;
  if (locale === "fr" && config.ctaLabelFr) return config.ctaLabelFr;
  return config.ctaLabel ?? "Join now";
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

export function WebsiteHeader({ locale, stationId }: { locale: string; stationId?: string }) {
  const [config, setConfig] = useState<HeaderConfig | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const cartCount = useCartCount();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = stationId ? `/api/website/header?station_id=${stationId}` : "/api/website/header";
    fetch(url).then((r) => r.json()).then((d) => { if (d.id) setConfig(d); }).catch(() => {});
  }, [stationId]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  if (!config) return null;

  const isRtl = locale === "ar";
  const bg = config.backgroundColor ?? "#ffffff";
  const text = config.textColor ?? "#0a1628";
  const accent = config.accentColor ?? "#0a1628";
  const navItems = [...(config.navItems ?? [])].sort((a, b) => a.position - b.position).filter((i) => i.isActive);

  const ctaStyle = config.ctaStyle ?? "filled";
  const ctaLabel = getCtaLabel(config, locale);

  return (
    <header
      style={{
        backgroundColor: bg,
        color: text,
        position: config.sticky ? "sticky" : "relative",
        top: 0,
        zIndex: 50,
        borderBottom: scrolled ? `1px solid rgba(0,0,0,0.08)` : "1px solid transparent",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: scrolled ? "0 1px 6px rgba(0,0,0,0.06)" : "none",
      }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href={`/${locale}`} className={isRtl ? "order-last" : "order-first"}>
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="Logo" className="h-9 object-contain" />
          ) : (
            <span className="text-lg font-bold" style={{ color: accent }}>⚽ Academy</span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav ref={dropdownRef} className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {(isRtl ? [...navItems].reverse() : navItems).map((item) => (
            <div key={item.id} className="relative">
              {item.hasDropdown ? (
                <button
                  onClick={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
                  style={{ color: text }}
                >
                  {getLabel(item, locale)}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === item.id ? "rotate-180" : ""}`} />
                </button>
              ) : (
                <Link
                  href={item.url ?? "#"}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
                  style={{ color: text }}
                >
                  {getLabel(item, locale)}
                </Link>
              )}

              {item.hasDropdown && activeDropdown === item.id && item.dropdownItems?.length > 0 && (
                <div
                  className={`absolute top-full mt-1 ${isRtl ? "right-0" : "left-0"} min-w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50`}
                  style={{ minWidth: item.dropdownItems.length > 4 ? "480px" : "220px" }}
                >
                  <div className={item.dropdownItems.length > 4 ? "grid grid-cols-2 p-2" : "p-2"}>
                    {item.dropdownItems.sort((a, b) => a.position - b.position).map((d) => (
                      <Link
                        key={d.id}
                        href={d.url}
                        className="flex items-start gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        {d.icon && <span className="text-gray-400 mt-0.5 flex-shrink-0 text-base">{d.icon}</span>}
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white">{getLabel(d, locale)}</p>
                          {d.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{d.description}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right side: lang switcher + cart + CTA */}
        <div className={`flex items-center gap-2 ${isRtl ? "order-first" : "order-last"}`}>
          {config.showLanguageSwitcher && <LanguageSwitcher variant="public" />}

          <Link href={`/${locale}/store/cart`} className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors" style={{ color: text }}>
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-xs font-bold rounded-full bg-red-500 text-white flex items-center justify-center">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          {config.ctaUrl && ctaLabel && (
            <Link
              href={config.ctaUrl}
              style={
                ctaStyle === "filled"
                  ? { backgroundColor: accent, color: "#fff", borderColor: accent }
                  : ctaStyle === "outlined"
                  ? { color: accent, borderColor: accent }
                  : { color: accent }
              }
              className={`hidden md:inline-flex items-center px-4 py-1.5 text-sm font-semibold rounded-lg transition-opacity hover:opacity-80 border ${ctaStyle === "text" ? "border-transparent" : "border-2"}`}
            >
              {ctaLabel}
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: text }}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ backgroundColor: bg, borderTop: "1px solid rgba(0,0,0,0.06)" }} className="md:hidden">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <div key={item.id}>
                <Link
                  href={item.url ?? "#"}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
                  style={{ color: text }}
                  onClick={() => setMobileOpen(false)}
                >
                  {getLabel(item, locale)}
                </Link>
                {item.hasDropdown && item.dropdownItems?.length > 0 && (
                  <div className="pl-4 space-y-1">
                    {item.dropdownItems.sort((a, b) => a.position - b.position).map((d) => (
                      <Link
                        key={d.id}
                        href={d.url}
                        className="block px-3 py-2 rounded-lg text-sm transition-colors hover:bg-black/5"
                        style={{ color: text, opacity: 0.8 }}
                        onClick={() => setMobileOpen(false)}
                      >
                        {getLabel(d, locale)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {config.ctaUrl && ctaLabel && (
              <Link
                href={config.ctaUrl}
                className="block mt-2 px-4 py-2.5 text-sm font-semibold rounded-xl text-center"
                style={{ backgroundColor: accent, color: "#fff" }}
                onClick={() => setMobileOpen(false)}
              >
                {ctaLabel}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
