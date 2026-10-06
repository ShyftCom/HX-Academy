import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAssignRole, requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermissionResponse(PERMISSIONS.HRM_VIEW);
  if (denied) return denied;
  const { id } = await params;

  const staff = await db.staffProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, role: { select: { id: true, name: true } } } },
      station: { select: { name: true } },
      attendances: { orderBy: { date: "desc" }, take: 60 },
      leaveRequests: { orderBy: { createdAt: "desc" } },
      payrolls: { orderBy: [{ year: "desc" }, { month: "desc" }] },
    },
  });
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(staff);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermissionResponse(PERMISSIONS.HRM_MANAGE);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();

  // Changing the role changes what the staff member's login can open. The
  // caller must be able to grant both the new role and the one being taken
  // away — otherwise an HR manager could demote a Super Admin.
  let roleName: string | undefined;
  if (body.roleId) {
    const current = await db.staffProfile.findUnique({ where: { id }, select: { userId: true, user: { select: { roleId: true } } } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const allowed =
      (await canAssignRole(session.user.id, body.roleId)) &&
      (!current.user.roleId || (await canAssignRole(session.user.id, current.user.roleId)));
    if (!allowed) return NextResponse.json({ error: "You cannot assign a role with more access than your own" }, { status: 403 });
    const role = await db.role.findUnique({ where: { id: body.roleId }, select: { name: true } });
    roleName = role?.name;
    await db.user.update({ where: { id: current.userId }, data: { roleId: body.roleId } });
  }

  const staff = await db.staffProfile.update({
    where: { id },
    data: {
      fullName: body.fullName,
      role: roleName ?? body.role,
      phone: body.phone,
      nationalId: body.nationalId,
      hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
      baseSalary: body.baseSalary !== undefined ? Number(body.baseSalary) : undefined,
      salaryType: body.salaryType,
      bankAccount: body.bankAccount,
      status: body.status,
      stationId: body.stationId ?? undefined,
    },
  });
  return NextResponse.json(staff);
}
