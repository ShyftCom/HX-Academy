import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  // Listing roles is how an attacker finds the Super Admin role id to assign
  // to themselves, so this is no longer open to any session.
  //
  // Either permission is accepted, because two screens legitimately need it:
  // the roles screen itself, and the users screen, whose role picker has to
  // name the roles it can assign. Someone holding users:view but not
  // roles:view could otherwise create a user and never be able to give them a
  // role.
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed =
    (await hasPermission(session.user.id, PERMISSIONS.ROLES_VIEW)) ||
    (await hasPermission(session.user.id, PERMISSIONS.USERS_VIEW));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const roles = await db.role.findMany({
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
  // Writes rolePermission rows directly, so an ungated create could mint a
  // role holding every permission and hand it to anyone.
  const denied = await requirePermissionResponse(PERMISSIONS.ROLES_CREATE);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const role = await db.role.create({ data: { name: body.name, description: body.description ?? null } });
    if (body.permissionIds?.length) {
      await db.rolePermission.createMany({
        data: body.permissionIds.map((pid: string) => ({ roleId: role.id, permissionId: pid })),
      });
    }
    return NextResponse.json(role, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") return NextResponse.json({ error: "Role name already exists" }, { status: 400 });
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
