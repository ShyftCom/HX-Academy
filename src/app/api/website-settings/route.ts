import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSetting, redactSecretSettings } from "@/lib/settings";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;

  const all = await db.setting.findMany();
  const result: Record<string, string> = {};
  for (const s of all) result[s.key] = s.value;
  // website:view is a content-editor permission, not a finance one — it should
  // not carry the payment-gateway API key along with the footer text.
  return NextResponse.json(redactSecretSettings(result));
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  try {
    const body = await req.json();
    await Promise.all(Object.entries(body).map(([key, value]) => setSetting(key, String(value ?? ""))));
    return NextResponse.json({ message: "Saved" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
