import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { setSetting } from "@/lib/settings";

const STORE_KEYS = [
  "store_enabled",
  "store_title",
  "store_title_fr",
  "store_title_ar",
  "store_description",
  "store_description_fr",
  "store_description_ar",
  "store_shipping_fee",
  "store_free_shipping_threshold",
  "store_low_stock_threshold",
  "store_order_email_template",
  "store_category_ids",
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.setting.findMany({ where: { key: { in: STORE_KEYS } } });
  const result: Record<string, string> = {};
  for (const s of settings) result[s.key] = s.value;
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await Promise.all(
    Object.entries(body)
      .filter(([k]) => STORE_KEYS.includes(k))
      .map(([k, v]) => setSetting(k, String(v ?? "")))
  );
  return NextResponse.json({ message: "Saved" });
}
