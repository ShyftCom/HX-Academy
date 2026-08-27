import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.ORDERS_EDIT);
  if (denied) return denied;

  const { id } = await params;
  try {
    const body = await req.json();
    const s = await db.orderStatus.update({ where: { id }, data: { name: body.name, color: body.color, isDefault: body.isDefault } });
    return NextResponse.json(s);
  } catch { return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.ORDERS_EDIT);
  if (denied) return denied;

  const { id } = await params;
  try {
    await db.orderStatus.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }); }
}
