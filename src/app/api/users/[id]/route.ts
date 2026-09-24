import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Any back-office account by id.
  const denied = await requirePermissionResponse(PERMISSIONS.USERS_VIEW);
  if (denied) return denied;
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: { role: true },
    omit: { password: true },
  } as any);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Sets roleId and, when present, a new password — so this was both a
  // self-promotion path to Super Admin and a way to reset any colleague's
  // password, on a bare session.
  const denied = await requirePermissionResponse(PERMISSIONS.USERS_EDIT);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const updateData: Record<string, unknown> = { name: body.name, roleId: body.roleId ?? null, isActive: body.isActive };
    if (body.password) updateData.password = await hashPassword(body.password);

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });
    const { password: _, ...safeUser } = user as any;
    return NextResponse.json(safeUser);
  } catch { return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.USERS_EDIT);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const user = await db.user.update({ where: { id }, data: { isActive: body.isActive } });
    return NextResponse.json({ id: user.id, isActive: user.isActive });
  } catch { return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.USERS_DELETE);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (id === session.user.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  try {
    await db.user.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }); }
}
