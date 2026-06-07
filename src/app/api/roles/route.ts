import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = await db.role.findMany({
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
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
