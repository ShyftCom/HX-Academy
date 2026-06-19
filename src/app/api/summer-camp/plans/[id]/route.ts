import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await db.summerCampPlan.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.programTrack !== undefined && { programTrack: body.programTrack }),
        ...(body.price !== undefined && { price: parseFloat(body.price) || 0 }),
        ...(body.description !== undefined && { description: body.description }),
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
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await db.summerCampPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
