import { db } from "@/lib/db";

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const setting = await db.setting.findUnique({ where: { key } });
  return setting?.value ?? fallback;
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const settings = await db.setting.findMany({
    where: { key: { in: keys } },
  });
  const result: Record<string, string> = {};
  for (const s of settings) result[s.key] = s.value;
  return result;
}

export async function setSetting(key: string, value: string, type = "string") {
  return db.setting.upsert({
    where: { key },
    update: { value, type },
    create: { key, value, type },
  });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const settings = await db.setting.findMany();
  const result: Record<string, string> = {};
  for (const s of settings) result[s.key] = s.value;
  return result;
}

export const DEFAULT_SETTINGS = {
  academy_name: "HX Academy",
  academy_email: "contact@hxacademy.com",
  academy_phone: "+213 000 000 000",
  academy_whatsapp: "+213 000 000 000",
  academy_address: "Algiers, Algeria",
  academy_logo: "",
  academy_favicon: "",
  primary_color: "#1e40af",
  secondary_color: "#0f172a",
  footer_text: "© 2024 HX Academy. All rights reserved.",
  terms_url: "",
  privacy_url: "",
  currency: "DZD",
  currency_symbol: "DA",
};
