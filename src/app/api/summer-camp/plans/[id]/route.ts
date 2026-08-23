import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await db.summerCampPlan.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.nameFr !== undefined && { nameFr: body.nameFr }),
        ...(body.nameAr !== undefined && { nameAr: body.nameAr }),
        ...(body.programTrack !== undefined && { programTrack: body.programTrack }),
        ...(body.price !== undefined && { price: parseFloat(body.price) || 0 }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.descriptionFr !== undefined && { descriptionFr: body.descriptionFr }),
        ...(body.descriptionAr !== undefined && { descriptionAr: body.descriptionAr }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.order !== undefined && { order: body.order }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  try {
    await db.summerCampPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
