import { createInstance } from "i18next";
import path from "path";
import fs from "fs";

const SUPPORTED_LANGS = ["en", "fr", "ar"] as const;
type Lang = typeof SUPPORTED_LANGS[number];

const cache = new Map<string, Record<string, unknown>>();

function loadNamespace(lang: string, ns: string): Record<string, unknown> {
  const key = `${lang}:${ns}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const filePath = path.join(process.cwd(), "public", "locales", lang, `${ns}.json`);
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as Record<string, unknown>;
    cache.set(key, data);
    return data;
  } catch {
    return {};
  }
}

function getNestedValue(obj: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);
}

export function createServerTranslator(lang: string, ns: string) {
  const resolvedLang: Lang = SUPPORTED_LANGS.includes(lang as Lang) ? (lang as Lang) : "fr";
  const primary = loadNamespace(resolvedLang, ns);
  const fallback = loadNamespace("fr", ns);

  return function t(key: string, params?: Record<string, string>): string {
    const raw = getNestedValue(primary, key) ?? getNestedValue(fallback, key) ?? key;
    return params ? interpolate(raw, params) : raw;
  };
}
