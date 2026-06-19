import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const updated = await db.summerCampSession.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
      ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
      ...(body.capacity !== undefined && { capacity: body.capacity ? Number(body.capacity) : null }),
      ...(body.price !== undefined && { price: body.price ? Number(body.price) : null }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.stationId !== undefined && { stationId: body.stationId }),
    },
    include: { _count: { select: { enrollments: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.summerCampSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
