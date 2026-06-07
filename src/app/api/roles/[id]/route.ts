import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const role = await db.role.findUnique({ where: { id }, include: { permissions: { include: { permission: true } } } });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(role);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const role = await db.role.update({ where: { id }, data: { name: body.name, description: body.description ?? null } });
    if (body.permissionIds !== undefined) {
      await db.rolePermission.deleteMany({ where: { roleId: id } });
      if (body.permissionIds.length) {
        await db.rolePermission.createMany({
          data: body.permissionIds.map((pid: string) => ({ roleId: id, permissionId: pid })),
        });
      }
    }
    return NextResponse.json(role);
  } catch { return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const role = await db.role.findUnique({ where: { id } });
    if (role?.isSystem) return NextResponse.json({ error: "Cannot delete system role" }, { status: 400 });
    await db.role.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }); }
}
