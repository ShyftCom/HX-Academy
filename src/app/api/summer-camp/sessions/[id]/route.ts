import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();

  const updated = await db.summerCampSession.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.nameFr !== undefined && { nameFr: body.nameFr }),
      ...(body.nameAr !== undefined && { nameAr: body.nameAr }),
      ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
      ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
      ...(body.capacity !== undefined && { capacity: body.capacity ? Number(body.capacity) : null }),
      ...(body.price !== undefined && { price: body.price ? Number(body.price) : null }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.descriptionFr !== undefined && { descriptionFr: body.descriptionFr }),
      ...(body.descriptionAr !== undefined && { descriptionAr: body.descriptionAr }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.stationId !== undefined && { stationId: body.stationId }),
    },
    include: { _count: { select: { enrollments: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  await db.summerCampSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
