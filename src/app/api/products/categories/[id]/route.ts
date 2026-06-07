import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const cat = await db.productCategory.update({ where: { id }, data: { name: body.name, description: body.description ?? null, image: body.image ?? null, isActive: body.isActive } });
    return NextResponse.json(cat);
  } catch { return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await db.productCategory.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }); }
}
