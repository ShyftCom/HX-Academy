import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { put, del } from "@vercel/blob";

const LOGO_KEYS = [
  "logo_website_light", "logo_website_dark", "logo_website_favicon",
  "logo_admin_light", "logo_admin_dark", "logo_admin_sidebar",
  "logo_player_light", "logo_player_dark", "logo_player_sidebar",
];

export async function GET() {
  const settings = await db.setting.findMany({ where: { key: { in: LOGO_KEYS } } });
  const result: Record<string, string> = {};
  for (const s of settings) result[s.key] = s.value;
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const key = form.get("key") as string;
  const file = form.get("file") as File | null;

  if (!key || !LOGO_KEYS.includes(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const filename = `branding/${key}-${Date.now()}.${file.name.split(".").pop()}`;
  const blob = await put(filename, file, { access: "public", contentType: file.type });

  await db.setting.upsert({
    where: { key },
    update: { value: blob.url },
    create: { key, value: blob.url, type: "string" },
  });

  return NextResponse.json({ url: blob.url });
}

export async function DELETE(req: NextRequest) {
  const { key } = await req.json();
  if (!key || !LOGO_KEYS.includes(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const existing = await db.setting.findUnique({ where: { key } });
  if (existing?.value) {
    try { await del(existing.value); } catch {}
  }

  await db.setting.upsert({
    where: { key },
    update: { value: "" },
    create: { key, value: "", type: "string" },
  });

  return NextResponse.json({ ok: true });
}
