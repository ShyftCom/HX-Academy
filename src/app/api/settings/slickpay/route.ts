/**
 * Super-admin configuration for the SlickPay gateway.
 *
 * Separate from /api/settings because the API key and webhook secret live
 * here. This route requires settings:edit (Super Admin holds the "*" wildcard)
 * and never returns either secret in full — only whether one is set and its
 * last four characters, which is enough for an admin to tell two keys apart.
 */
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings, setSetting, maskSecret } from "@/lib/settings";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { SLICKPAY_SETTING_KEYS } from "@/lib/slickpay";
import { appUrl } from "@/lib/app-url";

export async function GET() {
  const denied = await requirePermissionResponse(PERMISSIONS.SETTINGS_EDIT);
  if (denied) return denied;

  const s = await getSettings([...SLICKPAY_SETTING_KEYS]);
  const publicKey = s.slickpay_public_key ?? "";
  const webhookSecret = s.slickpay_webhook_secret ?? "";

  return NextResponse.json({
    enabled: (s.slickpay_enabled ?? "false") === "true",
    mode: s.slickpay_mode === "production" ? "production" : "sandbox",
    accountUuid: s.slickpay_account_uuid ?? "",
    // Presence + hint only. The values themselves never leave the server.
    hasPublicKey: publicKey.trim().length > 0,
    publicKeyHint: maskSecret(publicKey),
    hasWebhookSecret: webhookSecret.trim().length > 0,
    // Shown so the admin can paste it into the SlickPay dashboard if they
    // ever want to configure the webhook there as well as per-invoice.
    webhookUrl: `${appUrl()}/api/payments/slickpay/webhook`,
  });
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.SETTINGS_EDIT);
  if (denied) return denied;
  const session = await auth();

  try {
    const body = await req.json();
    const changed: string[] = [];

    if (typeof body.enabled === "boolean") {
      await setSetting("slickpay_enabled", body.enabled ? "true" : "false");
      changed.push(`enabled=${body.enabled}`);
    }

    if (body.mode === "sandbox" || body.mode === "production") {
      await setSetting("slickpay_mode", body.mode);
      changed.push(`mode=${body.mode}`);
    }

    if (typeof body.accountUuid === "string") {
      await setSetting("slickpay_account_uuid", body.accountUuid.trim());
    }

    // An empty/absent publicKey means "leave the stored key alone" — the form
    // never receives the current value, so it cannot send it back.
    if (typeof body.publicKey === "string" && body.publicKey.trim()) {
      await setSetting("slickpay_public_key", body.publicKey.trim());
      changed.push("api key rotated");
    }

    // The webhook secret is ours, not SlickPay's: we send it as
    // `webhook_signature` on each invoice and require it back on the callback.
    if (body.regenerateWebhookSecret === true) {
      await setSetting("slickpay_webhook_secret", randomBytes(32).toString("hex"));
      changed.push("webhook secret regenerated");
    } else {
      const existing = await getSettings(["slickpay_webhook_secret"]);
      if (!existing.slickpay_webhook_secret) {
        await setSetting("slickpay_webhook_secret", randomBytes(32).toString("hex"));
      }
    }

    await logActivity({
      userId: session?.user?.id,
      action: "update",
      module: "settings",
      description: `SlickPay gateway settings updated${changed.length ? `: ${changed.join(", ")}` : ""}`,
    });

    return NextResponse.json({ message: "SlickPay settings saved" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
