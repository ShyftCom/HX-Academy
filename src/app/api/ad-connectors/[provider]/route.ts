import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { isAdProvider, validateAdConnector, LEAD_EVENTS, type AdConnectorInput } from "@/lib/ad-tracking/config";
import { listAdConnectors } from "@/lib/ad-tracking/server";

/**
 * Save one ad connector. Validation runs here regardless of what the form did:
 * the tracking ID ends up inside a script URL and SDK call on every public
 * page, so it must match the provider's exact format. A connector that fails
 * validation is still saved (so the admin's typing isn't lost) but is forced
 * off — it can only be enabled once it is valid.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.SETTINGS_EDIT);
  if (denied) return denied;
  const session = await auth();

  const { provider } = await params;
  if (!isAdProvider(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const input: AdConnectorInput = {
    enabled: body.enabled === true,
    trackingId: provider === "google_ads" ? str(body.trackingId).toUpperCase() : str(body.trackingId),
    conversionLabel: provider === "google_ads" ? str(body.conversionLabel) : "",
    leadEvent: LEAD_EVENTS[provider].includes(str(body.leadEvent)) ? str(body.leadEvent) : LEAD_EVENTS[provider][0],
    trackPageViews: body.trackPageViews !== false,
    trackLeads: body.trackLeads !== false,
  };
  if (provider === "snapchat") input.trackingId = input.trackingId.toLowerCase();

  const errors = validateAdConnector(provider, input);
  if (errors.length > 0 && input.enabled) {
    return NextResponse.json({ error: "validation", errors }, { status: 422 });
  }

  try {
    const data = {
      ...input,
      validationState: errors.length === 0 ? "valid" : input.trackingId ? "invalid" : "incomplete",
      validationErrors: errors.length ? errors.join(",") : null,
      updatedById: session?.user?.id ?? null,
    };
    await db.adConnector.upsert({ where: { provider }, update: data, create: { provider, ...data } });

    await logActivity({
      userId: session?.user?.id,
      action: "update",
      module: "settings",
      description: `Ad connector ${provider} saved (enabled=${input.enabled})`,
    });

    const saved = (await listAdConnectors()).find((c) => c.provider === provider);
    return NextResponse.json({ connector: saved });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
