"use client";

import "@/i18n";
import { useState, useRef, useEffect } from "react";
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

interface LanguageSwitcherProps {
  variant?: "public" | "admin";
}

export function LanguageSwitcher({ variant = "admin" }: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<LocaleCode>("fr");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = getStoredLocale();
    setCurrent(stored);
    applyLocale(stored);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function switchLocale(code: LocaleCode) {
    setOpen(false);
    setCurrent(code);
    applyLocale(code);

    // Persist preference to server
    fetch("/api/user/language", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: code }),
    }).catch(() => {});
  }

  const active = LOCALES.find((l) => l.code === current) ?? LOCALES[0];
  const isAdmin = variant === "admin";

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
