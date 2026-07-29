import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;

  const { id } = await params;
  const player = await db.summerCampPlayer.findUnique({
    where: { id },
    include: {
      session: true,
      station: { select: { id: true, name: true } },
      documents: { include: { requirement: { select: { id: true, title: true } } }, orderBy: { createdAt: "desc" } },
      lead: { select: { id: true, fullName: true, isConverted: true } },
    },
  });

  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(player);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();

  const updated = await db.summerCampPlayer.update({
    where: { id },
    data: {
      ...(body.fullName !== undefined && { fullName: body.fullName }),
      ...(body.dateOfBirth !== undefined && { dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null }),
      ...(body.age !== undefined && { age: body.age }),
      ...(body.gender !== undefined && { gender: body.gender }),
      ...(body.healthNotes !== undefined && { healthNotes: body.healthNotes }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.guardianName !== undefined && { guardianName: body.guardianName }),
      ...(body.guardianPhone !== undefined && { guardianPhone: body.guardianPhone }),
      ...(body.guardianEmail !== undefined && { guardianEmail: body.guardianEmail }),
      ...(body.guardianRelation !== undefined && { guardianRelation: body.guardianRelation }),
      ...(body.sessionId !== undefined && { sessionId: body.sessionId }),
      ...(body.stationId !== undefined && { stationId: body.stationId }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.paymentStatus !== undefined && { paymentStatus: body.paymentStatus }),
      ...(body.paidAmount !== undefined && { paidAmount: body.paidAmount ? Number(body.paidAmount) : null }),
    },
    include: { session: { select: { id: true, name: true } }, station: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  await db.summerCampPlayer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
