import { db } from "@/lib/db";
import {
  AD_PROVIDERS,
  LEAD_EVENTS,
  validateAdConnector,
  type AdProvider,
  type PublicAdConfig,
} from "@/lib/ad-tracking/config";

export interface AdConnectorRecord {
  provider: AdProvider;
  enabled: boolean;
  trackingId: string;
  conversionLabel: string;
  leadEvent: string;
  trackPageViews: boolean;
  trackLeads: boolean;
  validationState: string;
  validationErrors: string[];
  updatedAt: string | null;
}

/** Every provider, with defaults for those never saved (no row yet). */
export async function listAdConnectors(): Promise<AdConnectorRecord[]> {
  const rows = await db.adConnector.findMany({ where: { provider: { in: [...AD_PROVIDERS] } } });
  return AD_PROVIDERS.map((provider) => {
    const r = rows.find((x) => x.provider === provider);
    return {
      provider,
      enabled: r?.enabled ?? false,
      trackingId: r?.trackingId ?? "",
      conversionLabel: r?.conversionLabel ?? "",
      leadEvent: r?.leadEvent || LEAD_EVENTS[provider][0],
      trackPageViews: r?.trackPageViews ?? true,
      trackLeads: r?.trackLeads ?? true,
      validationState: r?.validationState ?? "incomplete",
      validationErrors: r?.validationErrors ? r.validationErrors.split(",") : [],
      updatedAt: r?.updatedAt.toISOString() ?? null,
    };
  });
}

/**
 * The config the public site loads. A connector is included only when it is
 * enabled AND re-validates now — a row that was valid once but edited in the
 * database by hand never reaches the page.
 */
export async function getPublicAdConfig(): Promise<PublicAdConfig> {
  const out: PublicAdConfig = {};
  for (const c of await listAdConnectors()) {
    if (!c.enabled || validateAdConnector(c.provider, c).length > 0) continue;
    if (c.provider === "tiktok") {
      out.tiktok = { pixelId: c.trackingId, pageViews: c.trackPageViews, leads: c.trackLeads, leadEvent: c.leadEvent };
    } else if (c.provider === "google_ads") {
      out.google_ads = { tagId: c.trackingId, conversionLabel: c.conversionLabel, pageViews: c.trackPageViews, leads: c.trackLeads };
    } else {
      out.snapchat = { pixelId: c.trackingId, pageViews: c.trackPageViews, leads: c.trackLeads };
    }
  }
  return out;
}
