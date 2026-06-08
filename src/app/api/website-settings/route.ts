import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { setSetting } from "@/lib/settings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await db.setting.findMany();
  const result: Record<string, string> = {};
  for (const s of all) result[s.key] = s.value;
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    await Promise.all(Object.entries(body).map(([key, value]) => setSetting(key, String(value ?? ""))));
    return NextResponse.json({ message: "Saved" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
