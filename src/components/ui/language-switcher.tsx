"use client";

import "@/i18n";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import i18n from "@/i18n";

/**
 * One component, two audiences.
 *
 *  - variant="public"  — the showcase site. French and Arabic only; English is
 *                        gone. The locale lives in the URL (/fr/..., /ar/...)
 *                        and the server renders from it, so switching is a
 *                        navigation, not a client state change.
 *  - variant="admin"   — the back-office. Still trilingual (i18next), still
 *                        driven purely by client state because admin routes
 *                        carry no locale segment.
 *
 * The two lists are separate on purpose: removing English from the public site
 * must not remove it from the dashboard.
 */
const PUBLIC_LOCALES = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "ar", flag: "🇩🇿", label: "العربية" },
] as const;

const ADMIN_LOCALES = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ar", flag: "🇩🇿", label: "العربية" },
] as const;

type LocaleCode = "fr" | "en" | "ar";

const STORAGE_KEY = "shyftcom_lang";
const COOKIE_KEY = "NEXT_LOCALE";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function applyLocale(code: LocaleCode) {
  i18n.changeLanguage(code);
  localStorage.setItem(STORAGE_KEY, code);
  document.documentElement.lang = code;
  document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
}

/**
 * Mirror the choice into the cookie next-intl reads on the next request, so a
 * returning visitor who typed the bare domain lands on the locale they picked
 * rather than whatever accept-language says. next-intl writes this itself on
 * localised navigations; setting it here covers the admin, where there is no
 * localised navigation to piggyback on.
 */
function persistLocaleCookie(code: LocaleCode) {
  if (code !== "fr" && code !== "ar") return; // public site locales only
  document.cookie = `${COOKIE_KEY}=${code}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function getStoredLocale(): LocaleCode {
  if (typeof window === "undefined") return "fr";
  // "eng" is the retired public URL segment; older browsers may still hold it.
  const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("locale");
  if (raw === "eng") return "en";
  if (raw === "fr" || raw === "en" || raw === "ar") return raw;
  return "fr";
}

/**
 * The public site renders its content on the server from the URL segment, so
 * the URL — not localStorage — is what the visitor is actually looking at.
 * Returns null on the admin and other non-localised routes, where the stored
 * preference is the only signal.
 */
function localeFromPathname(pathname: string | null): LocaleCode | null {
  const segment = (pathname ?? "").split("/")[1];
  if (segment === "fr" || segment === "ar") return segment;
  return null;
}

interface LanguageSwitcherProps {
  variant?: "public" | "admin";
}

export function LanguageSwitcher({ variant = "admin" }: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [storedLocale, setStoredLocale] = useState<LocaleCode>("fr");
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const isAdmin = variant === "admin";
  const locales = isAdmin ? ADMIN_LOCALES : PUBLIC_LOCALES;

  // On a localised route the URL is authoritative and needs no state at all,
  // so the correct flag renders on the first pass. Only the admin, whose URLs
  // carry no locale, falls back to the stored preference — and reading
  // localStorage can only happen after hydration.
  const urlLocale = localeFromPathname(pathname);
  const current = urlLocale ?? storedLocale;

  useEffect(() => {
    if (urlLocale) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is unavailable during render
    setStoredLocale(getStoredLocale());
  }, [urlLocale]);

  // Keep <html lang/dir> and i18n in step with whatever is current. This used
  // to apply the *stored* preference unconditionally, so a visitor who had
  // once chosen Arabic got dir="rtl" on <html> for every page including /fr,
  // whose content is French. Tailwind's rtl: variant matches any descendant
  // of [dir="rtl"], so the layout's own dir="ltr" wrapper could not undo it
  // and French pages laid themselves out right-to-left.
  useEffect(() => {
    applyLocale(current);
  }, [current]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function switchLocale(code: LocaleCode) {
    setOpen(false);
    setStoredLocale(code);
    applyLocale(code);
    persistLocaleCookie(code);

    // Only signed-in users have a row to write to; anonymous visitors on the
    // public site get a 401 here, which is why the failure is swallowed.
    fetch("/api/user/language", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: code }),
    }).catch(() => {});

    // Public pages are rendered on the server from the locale in the URL, so
    // changing only the client state left the visitor on French content with
    // an Arabic layout. Swap the prefix in place and let the server re-render.
    //
    // `scroll: false` is what keeps the visitor where they were: without it
    // Next resets to the top of the document, so switching language halfway
    // down a programme page threw the reader back to the hero.
    if (urlLocale) {
      const segments = (pathname ?? "/").split("/");
      segments[1] = code;
      router.replace(segments.join("/") + window.location.search + window.location.hash, {
        scroll: false,
      });
    }
  }

  const active = locales.find((l) => l.code === current) ?? locales[0];

  const btnClass = isAdmin
    ? "flex h-9 items-center gap-1.5 rounded-[var(--ob-radius-control)] px-2.5 text-[13px] font-medium text-[var(--ob-text-secondary)] transition-colors hover:bg-[var(--ob-surface-high)] hover:text-[var(--ob-text)]"
    : "flex items-center gap-1.5 rounded-[var(--ob-radius-control)] border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20";

  const dropdownClass = isAdmin
    ? "ob-glass absolute end-0 z-50 mt-1 w-40 overflow-hidden rounded-[var(--ob-radius-container)] py-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
    : "absolute end-0 z-50 mt-1 w-40 overflow-hidden rounded-[var(--ob-radius-container)] border border-white/10 bg-[#131313] py-1 shadow-lg";

  const itemClass = (code: string) => isAdmin
    ? `flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors ${code === current ? "bg-[var(--ob-primary-soft)] font-medium text-[var(--ob-primary-light)]" : "text-[var(--ob-text-secondary)] hover:bg-[var(--ob-surface-high)] hover:text-[var(--ob-text)]"}`
    : `flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors ${code === current ? "bg-[var(--ob-primary)] font-medium text-white" : "text-gray-200 hover:bg-white/10"}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={btnClass}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={active.label}
      >
        <span aria-hidden="true">{active.flag}</span>
        <span>{active.code.toUpperCase()}</span>
        <ChevronDown className="w-3 h-3 opacity-60" aria-hidden="true" />
      </button>
      {open && (
        <div className={dropdownClass} role="listbox">
          {locales.map((l) => (
            <div
              key={l.code}
              role="option"
              aria-selected={l.code === current}
              onClick={() => switchLocale(l.code)}
              className={itemClass(l.code)}
            >
              <span aria-hidden="true">{l.flag}</span>
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
