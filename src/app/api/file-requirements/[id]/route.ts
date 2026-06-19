import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await db.fileRequirement.findUnique({
    where: { id },
    include: { _count: { select: { applicationFiles: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await db.fileRequirement.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isRequired !== undefined && { isRequired: body.isRequired }),
        ...(body.allowedTypes !== undefined && { allowedTypes: body.allowedTypes }),
        ...(body.maxSizeMb !== undefined && { maxSizeMb: body.maxSizeMb }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.appliesTo !== undefined && { appliesTo: body.appliesTo }),
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
    const item = await db.fileRequirement.findUnique({
      where: { id },
      include: { _count: { select: { applicationFiles: true } } },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (item._count.applicationFiles > 0) {
      return NextResponse.json({ error: "Cannot delete: files have been uploaded for this requirement" }, { status: 400 });
    }
    await db.fileRequirement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
