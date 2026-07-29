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
  academy_name: "Football Skills Academy",
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
  footer_text: "© 2024 Football Skills Academy. All rights reserved.",
  terms_url: "",
  privacy_url: "",
  currency: "DZD",
  currency_symbol: "DA",

  // ---- Showcase Website theme (public site only — independent of the admin
  // primary_color/secondary_color above; see ThemeVars.tsx) ----
  website_booking_url: "/apply",
  website_color_navy_900: "#001F49",
  website_color_navy_800: "#002B5C",
  website_color_sky: "#43C7ED",
  website_color_heading_blue: "#3996D6",
  website_color_pale_bg: "#EEF5FC",
  website_color_text: "#071E41",
  website_color_text_muted: "#5E6D82",
  website_color_border: "#DCE6F1",
  website_color_success: "#168A55",
  website_color_error: "#C0392B",
  website_font_display: "Barlow Condensed",
  website_font_body: "Inter",
  website_heading_weight: "700",
  website_heading_uppercase: "false",
};
