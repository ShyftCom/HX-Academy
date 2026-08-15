import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Editing a plan changes its price, which the self-service payment path
  // reads server-side when recording what a player owes.
  const denied = await requirePermissionResponse(PERMISSIONS.SUBS_EDIT);
  if (denied) return denied;
  const { id } = await params;
  try {
    const body = await req.json();
    const plan = await db.subscriptionPlan.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description ?? null,
        duration: body.duration ? parseInt(body.duration) : undefined,
        durationType: body.durationType,
        price: body.price ? parseFloat(body.price) : undefined,
        color: body.color,
        isActive: body.isActive,
      },
    });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.SUBS_DELETE);
  if (denied) return denied;
  const { id } = await params;
  try {
    await db.subscriptionPlan.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
