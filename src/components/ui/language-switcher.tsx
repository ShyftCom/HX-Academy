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
