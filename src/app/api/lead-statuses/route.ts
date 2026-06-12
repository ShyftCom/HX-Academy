import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const statuses = await db.leadStatus.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(statuses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (body.name.trim().length > 40) return NextResponse.json({ error: "Name must be 40 characters or less" }, { status: 400 });
    const count = await db.leadStatus.count();
    const status = await db.leadStatus.create({
      data: {
        name: body.name.trim(),
        color: body.color ?? "#6B7280",
        order: body.position ?? count,
        isDefault: false,
        isTerminal: body.isTerminal ?? false,
      },
    });
    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
