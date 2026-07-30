"use client";

import "@/i18n";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import i18n from "@/i18n";

const LOCALES = [
  { code: "fr",  flag: "🇫🇷", label: "Français" },
  { code: "en",  flag: "🇬🇧", label: "English" },
  { code: "ar",  flag: "🇩🇿", label: "العربية" },
] as const;

type LocaleCode = typeof LOCALES[number]["code"];

const STORAGE_KEY = "shyftcom_lang";

function applyLocale(code: LocaleCode) {
  i18n.changeLanguage(code);
  localStorage.setItem(STORAGE_KEY, code);
  document.documentElement.lang = code;
  document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
}

function getStoredLocale(): LocaleCode {
  if (typeof window === "undefined") return "fr";
  // Support legacy "eng" key from old switcher
  const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("locale");
  if (raw === "eng") return "en";
  if (raw === "fr" || raw === "en" || raw === "ar") return raw;
  return "fr";
}

// The public site routes as /fr, /eng, /ar and renders its content on the
// server from that segment, so the URL — not localStorage — is what the
// visitor is actually looking at. Returns null on the admin and other
// non-localised routes, where the stored preference is the only signal.
//
// Note the spelling difference: the URL segment is "eng", the i18n code "en".
function localeFromPathname(pathname: string | null): LocaleCode | null {
  const segment = (pathname ?? "").split("/")[1];
  if (segment === "eng") return "en";
  if (segment === "fr" || segment === "ar") return segment;
  return null;
}

function toUrlSegment(code: LocaleCode): string {
  return code === "en" ? "eng" : code;
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

    // Persist preference to server
    fetch("/api/user/language", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: code }),
    }).catch(() => {});

    // Public pages are rendered on the server from the locale in the URL, so
    // changing only the client state left the visitor on French content with
    // an Arabic layout. Move to the same path under the chosen locale and let
    // the server re-render it. Admin routes are not localised by URL, so they
    // keep working purely off the client state above.
    if (urlLocale) {
      const segments = (pathname ?? "/").split("/");
      segments[1] = toUrlSegment(code);
      router.push(segments.join("/") + window.location.search);
    }
  }

  const active = LOCALES.find((l) => l.code === current) ?? LOCALES[0];
  const isAdmin = variant === "admin";

  const btnClass = isAdmin
    ? "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
    : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/20";

  const dropdownClass = isAdmin
    ? "absolute end-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 py-1 overflow-hidden"
    : "absolute end-0 mt-1 w-36 bg-gray-900 border border-white/10 rounded-xl shadow-lg z-50 py-1 overflow-hidden";

  const itemClass = (code: string) => isAdmin
    ? `flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${code === current ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`
    : `flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${code === current ? "bg-green-700 text-white font-medium" : "text-gray-200 hover:bg-gray-700"}`;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className={btnClass}>
        <span>{active.flag}</span>
        <span>{active.code.toUpperCase()}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className={dropdownClass}>
          {LOCALES.map((l) => (
            <div key={l.code} onClick={() => switchLocale(l.code)} className={itemClass(l.code)}>
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
