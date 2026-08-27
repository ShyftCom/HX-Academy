import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Editing a method rewrites the account players are told to pay into, so it
  // carries the same authority as creating one.
  const denied = await requirePermissionResponse(PERMISSIONS.SETTINGS_EDIT);
  if (denied) return denied;
  const { id } = await params;
  try {
    const body = await req.json();
    const method = await db.paymentMethod.update({
      where: { id },
      data: { name: body.name, instructions: body.instructions ?? null, accountDetails: body.accountDetails ?? null, isActive: body.isActive },
    });
    return NextResponse.json(method);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.SETTINGS_EDIT);
  if (denied) return denied;
  const { id } = await params;
  try {
    await db.paymentMethod.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
