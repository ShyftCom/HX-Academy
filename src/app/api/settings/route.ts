import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAllSettings,
  setSetting,
  redactSecretSettings,
  SECRET_SETTING_KEYS,
} from "@/lib/settings";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Any signed-in user reaches this, players included, so credentials are
  // stripped. The gateway config UI reads them from /api/settings/slickpay
  // instead, which is permission-gated. See SECRET_SETTING_KEYS.
  const settings = await getAllSettings();
  return NextResponse.json(redactSecretSettings(settings));
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.SETTINGS_EDIT);
  if (denied) return denied;

  try {
    const body = await req.json();

    // The settings form round-trips whatever GET returned. Since GET redacts
    // credentials, a PUT carrying one is either a stale payload or an attempt
    // to write a key through the unguarded door — reject either way.
    const secrets = Object.keys(body).filter((k) => SECRET_SETTING_KEYS.has(k));
    if (secrets.length > 0) {
      return NextResponse.json(
        { error: `Use /api/settings/slickpay to change: ${secrets.join(", ")}` },
        { status: 400 },
      );
    }

    await Promise.all(
      Object.entries(body).map(([key, value]) => setSetting(key, String(value)))
    );
    return NextResponse.json({ message: "Settings saved" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
