import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const existing = await db.leadStatus.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Status not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim().slice(0, 40);
    if (body.color !== undefined) data.color = body.color;
    if (body.order !== undefined) data.order = body.order;
    if (body.isTerminal !== undefined && !existing.isDefault) data.isTerminal = body.isTerminal;

    const status = await db.leadStatus.update({ where: { id }, data });
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const existing = await db.leadStatus.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Status not found" }, { status: 404 });
    if (existing.isDefault) return NextResponse.json({ error: "Default statuses cannot be deleted" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const fallbackStatusId = body.fallbackStatusId ?? null;

    // Move all leads in this status to the fallback (or null)
    await db.$transaction([
      db.lead.updateMany({
        where: { statusId: id },
        data: { statusId: fallbackStatusId },
      }),
      db.leadStatus.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
