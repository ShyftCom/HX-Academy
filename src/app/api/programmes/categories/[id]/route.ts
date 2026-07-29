import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  try {
    const body = await req.json();
    const category = await db.programmeCategory.update({
      where: { id },
      data: { name: body.name, nameFr: body.nameFr, nameAr: body.nameAr, colorTag: body.colorTag, order: body.order, isActive: body.isActive },
    });
    return NextResponse.json(category);
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
    await db.programmeCategory.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
