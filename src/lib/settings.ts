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

/**
 * Settings that are credentials, not configuration.
 *
 * Everything else in this table is public-ish (colours, phone numbers, social
 * URLs) and GET /api/settings hands the whole table to any signed-in user —
 * which includes every player. A payment-gateway API key cannot travel that
 * route: anyone holding it can create invoices against the academy's SlickPay
 * account. These keys are therefore stripped from the generic settings
 * endpoint and are only ever written through /api/settings/slickpay, which
 * requires settings:edit. They are never sent back to a browser at all — the
 * UI shows a "configured / not configured" flag and a masked hint instead.
 */
export const SECRET_SETTING_KEYS = new Set<string>([
  "slickpay_public_key",
  "slickpay_webhook_secret",
]);

/** A copy of `settings` with every credential removed. */
export function redactSecretSettings(settings: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) {
    if (!SECRET_SETTING_KEYS.has(k)) out[k] = v;
  }
  return out;
}

/** Last 4 characters of a secret, for "…which key is this?" confirmation. */
export function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
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

  // ---- SlickPay (SATIM card gateway) ----
  // slickpay_public_key and slickpay_webhook_secret are deliberately absent:
  // they are credentials, live only in the Setting table once an admin enters
  // them, and are listed in SECRET_SETTING_KEYS so they never reach a client.
  slickpay_enabled: "false",
  slickpay_mode: "sandbox",
  slickpay_account_uuid: "",

  // ---- Showcase Website theme (public site only — independent of the admin
  // primary_color/secondary_color above; see ThemeVars.tsx) ----
  website_booking_url: "/apply",
  website_color_navy_900: "#1B1315",
  website_color_navy_800: "#3B1E22",
  website_color_sky: "#A32F33",
  website_color_heading_blue: "#C0453F",
  website_color_pale_bg: "#F8F2F2",
  website_color_text: "#1F1719",
  website_color_text_muted: "#6E6164",
  website_color_border: "#E8DDDD",
  website_color_success: "#157347",
  website_color_error: "#B3261E",
  website_font_display: "Barlow Condensed",
  website_font_body: "Inter",
  website_heading_weight: "700",
  website_heading_uppercase: "false",
};
