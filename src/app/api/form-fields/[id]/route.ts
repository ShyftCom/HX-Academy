import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const field = await db.formField.update({
      where: { id },
      data: { label: body.label, fieldType: body.fieldType, placeholder: body.placeholder ?? null, options: body.options ? JSON.stringify(body.options) : null, isRequired: body.isRequired, isActive: body.isActive },
    });
    return NextResponse.json(field);
  } catch { return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const field = await db.formField.findUnique({ where: { id } });
    if (field?.isDefault) return NextResponse.json({ error: "Cannot delete default field" }, { status: 400 });
    await db.formField.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }); }
}
