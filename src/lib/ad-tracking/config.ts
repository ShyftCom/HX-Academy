/**
 * Shared (client-safe) definitions for the TikTok / Google Ads / Snapchat ad
 * connectors. No database access here — the admin UI imports this for the same
 * validation the API enforces.
 *
 * The global Meta Pixel is deliberately absent: it has its own settings rows
 * and component (MetaPixel.tsx) and this module never reads or drives it.
 */

export const AD_PROVIDERS = ["tiktok", "google_ads", "snapchat"] as const;
export type AdProvider = (typeof AD_PROVIDERS)[number];

export function isAdProvider(v: unknown): v is AdProvider {
  return typeof v === "string" && (AD_PROVIDERS as readonly string[]).includes(v);
}

/**
 * Lead events each provider accepts. Only official standard event names:
 * TikTok has no standard "Lead" event — SubmitForm and CompleteRegistration
 * are the two its Ads Manager routes to the Lead objective. Snapchat's
 * standard event for a sign-up is SIGN_UP. Google Ads has no event name of
 * its own: a conversion is `event: conversion` sent to ID/label.
 */
export const LEAD_EVENTS: Record<AdProvider, readonly string[]> = {
  tiktok: ["SubmitForm", "CompleteRegistration"],
  google_ads: ["conversion"],
  snapchat: ["SIGN_UP"],
};

export interface AdConnectorInput {
  enabled: boolean;
  trackingId: string;
  conversionLabel: string;
  leadEvent: string;
  trackPageViews: boolean;
  trackLeads: boolean;
}

/**
 * Tracking IDs are passed to provider SDKs (and the gtag.js URL), so they are
 * held to a strict character set: anything that could break out of a string
 * or a URL is rejected, not escaped.
 */
const ID_PATTERNS: Record<AdProvider, RegExp> = {
  // e.g. C4ABCDEF12GHIJ345678 — uppercase letters and digits
  tiktok: /^[A-Z0-9]{10,30}$/,
  // e.g. AW-123456789
  google_ads: /^AW-\d{6,15}$/,
  // e.g. 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d
  snapchat: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

const LABEL_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

/** Error codes (translated in the UI as `bo.ad_connectors.errors.<code>`). */
export type AdValidationError =
  | "tracking_id_missing"
  | "tracking_id_invalid"
  | "label_missing"
  | "label_invalid"
  | "lead_event_invalid";

export function validateAdConnector(provider: AdProvider, c: AdConnectorInput): AdValidationError[] {
  const errors: AdValidationError[] = [];
  if (!c.trackingId) errors.push("tracking_id_missing");
  else if (!ID_PATTERNS[provider].test(c.trackingId)) errors.push("tracking_id_invalid");

  if (provider === "google_ads" && c.trackLeads) {
    if (!c.conversionLabel) errors.push("label_missing");
    else if (!LABEL_PATTERN.test(c.conversionLabel)) errors.push("label_invalid");
  } else if (provider === "google_ads" && c.conversionLabel && !LABEL_PATTERN.test(c.conversionLabel)) {
    errors.push("label_invalid");
  }

  if (!LEAD_EVENTS[provider].includes(c.leadEvent)) errors.push("lead_event_invalid");
  return errors;
}

/** What the public site receives — IDs and switches only, never anything else. */
export interface PublicAdConfig {
  tiktok?: { pixelId: string; pageViews: boolean; leads: boolean; leadEvent: string };
  google_ads?: { tagId: string; conversionLabel: string; pageViews: boolean; leads: boolean };
  snapchat?: { pixelId: string; pageViews: boolean; leads: boolean };
}
