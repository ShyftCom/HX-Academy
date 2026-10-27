import { getPublicAdConfig } from "@/lib/ad-tracking/server";
import { AdTrackingClient } from "@/components/website/AdTrackingClient";

/** Sitewide TikTok / Google Ads / Snapchat tags, configured from API
 *  Connectors. Independent of MetaPixel, which is mounted beside it. */
export async function AdTracking() {
  let config;
  try {
    config = await getPublicAdConfig();
  } catch {
    return null;
  }
  if (!config.tiktok && !config.google_ads && !config.snapchat) return null;
  return <AdTrackingClient config={config} />;
}
