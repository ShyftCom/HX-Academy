/**
 * "Test connection" for the SlickPay settings tab.
 *
 * Lets a Super Admin confirm a key works *before* switching the gateway on,
 * instead of discovering a bad key when the first player hits a dead checkout.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import { getSlickPayConfig, testConnection } from "@/lib/slickpay";

export async function POST(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.SETTINGS_EDIT);
  if (denied) return denied;

  const config = await getSlickPayConfig();

  // Allow testing a key that is typed into the form but not yet saved, and a
  // mode the admin is considering but has not committed to.
  let body: { publicKey?: string; mode?: string } = {};
  try {
    body = await req.json();
  } catch {
    // No body is fine — test whatever is stored.
  }
  if (typeof body.publicKey === "string" && body.publicKey.trim()) {
    config.publicKey = body.publicKey.trim();
  }
  if (body.mode === "sandbox" || body.mode === "production") {
    config.mode = body.mode;
  }

  if (!config.publicKey) {
    return NextResponse.json(
      { ok: false, error: "No API key configured" },
      { status: 400 },
    );
  }

  const result = await testConnection(config);
  return NextResponse.json({ ...result, mode: config.mode });
}
