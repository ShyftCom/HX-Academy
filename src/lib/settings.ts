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
  academy_name: "Foot-Ball Skills Academy",
  academy_email: "contact@footballskillsacademy.com",
  academy_phone: "+213 000 000 000",
  academy_whatsapp: "+213 000 000 000",
  academy_address: "Algiers, Algeria",
  academy_logo: "",
  academy_favicon: "",
  logo_website_light: "",
  logo_website_dark: "",
  logo_website_favicon: "",
  logo_admin_light: "",
  logo_admin_dark: "",
  logo_admin_sidebar: "",
  logo_player_light: "",
  logo_player_dark: "",
  logo_player_sidebar: "",
  primary_color: "#A02020",
  secondary_color: "#903030",
  dark_bg_color: "#101010",
  card_dark_color: "#202020",
  font_family: "Inter",
  footer_copyright: "",
  footer_text: "© 2024 Foot-Ball Skills Academy. All rights reserved.",
  terms_url: "",
  privacy_url: "",
  currency: "DZD",
  currency_symbol: "DA",
};
