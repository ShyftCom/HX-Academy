/**
 * API Connectors overview: the three ad connectors this app owns (TikTok,
 * Google Ads, Snapchat) plus a read-only status line for the existing Meta
 * Pixel. Meta is only *read* here — it is still configured from Settings >
 * Meta Pixel and nothing on this route can write it.
 */
import { NextResponse } from "next/server";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { listAdConnectors } from "@/lib/ad-tracking/server";

export async function GET() {
  const denied = await requirePermissionResponse(PERMISSIONS.SETTINGS_VIEW);
  if (denied) return denied;

  try {
    const [connectors, meta] = await Promise.all([
      listAdConnectors(),
      getSettings(["meta_pixel_enabled", "meta_pixel_id"]),
    ]);
    return NextResponse.json({
      connectors,
      meta: {
        enabled: meta.meta_pixel_enabled === "true",
        configured: /^\d+$/.test((meta.meta_pixel_id ?? "").trim()),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}
