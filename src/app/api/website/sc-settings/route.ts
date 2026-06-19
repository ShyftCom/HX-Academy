import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const SC_KEYS = ["sc_page_title", "sc_page_hero_image", "sc_page_description", "sc_page_cta_label"];

export async function GET() {
  const rows = await db.setting.findMany({ where: { key: { in: SC_KEYS } } });
  const result: Record<string, string> = {};
  for (const r of rows) result[r.key] = r.value;
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  await Promise.all(
    SC_KEYS.filter((k) => body[k] !== undefined).map((k) =>
      db.setting.upsert({
        where: { key: k },
        update: { value: body[k] ?? "" },
        create: { key: k, value: body[k] ?? "" },
      })
    )
  );

  return NextResponse.json({ success: true });
}
