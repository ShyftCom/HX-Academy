import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAssignRole, getUserPermissions, requirePermissionResponse, resolveRolePermissionIds, PERMISSIONS } from "@/lib/permissions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.ROLES_VIEW);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const role = await db.role.findUnique({ where: { id }, include: { permissions: { include: { permission: true } } } });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(role);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rewrites a role's entire permission set. Ungated, any signed-in user could
  // grant their own role every permission in the system.
  const denied = await requirePermissionResponse(PERMISSIONS.ROLES_EDIT);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const existing = await db.role.findUnique({ where: { id }, include: { permissions: { select: { permissionId: true } } } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Super Admin's reach comes from its name ("*" in getUserPermissions), not
    // its rows, so only a Super Admin may touch that role at all.
    const isSuperAdmin = (await getUserPermissions(session.user.id)).includes("*");
    if (existing.name === "Super Admin" && !isSuperAdmin) {
      return NextResponse.json({ error: "Only a Super Admin can edit this role", code: "forbidden" }, { status: 403 });
    }
    // System role names are load-bearing (Super Admin's wildcard, Admin
    // notifications, Player detection), so a rename would silently change who
    // holds what.
    if (existing.isSystem && body.name !== undefined && body.name !== existing.name) {
      return NextResponse.json({ error: "System roles cannot be renamed" }, { status: 400 });
    }

    let permissionIds: string[] | undefined;
    if (body.permissionIds !== undefined) {
      const resolved = await resolveRolePermissionIds(
        session.user.id,
        Array.isArray(body.permissionIds) ? body.permissionIds : [],
        existing.permissions.map((p) => p.permissionId),
      );
      if ("error" in resolved) return NextResponse.json({ error: resolved.error, code: "forbidden" }, { status: 403 });
      permissionIds = resolved.ids;
    }

    // One transaction: a failure between the delete and the insert used to
    // leave the role with no permissions at all.
    const role = await db.$transaction(async (tx) => {
      const updated = await tx.role.update({ where: { id }, data: { name: body.name ?? existing.name, description: body.description ?? null } });
      if (permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (permissionIds.length) {
          await tx.rolePermission.createMany({ data: permissionIds.map((pid) => ({ roleId: id, permissionId: pid })) });
        }
      }
      return updated;
    });
    return NextResponse.json(role);
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "Role name already exists" }, { status: 400 });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.ROLES_DELETE);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const role = await db.role.findUnique({ where: { id } });
    if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (role.isSystem) return NextResponse.json({ error: "Cannot delete system role" }, { status: 400 });
    // Deleting a role strips it from its holders; only someone who could hand
    // that role out may take it away.
    if (!(await canAssignRole(session.user.id, id))) return NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 });
    await db.role.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }); }
}
