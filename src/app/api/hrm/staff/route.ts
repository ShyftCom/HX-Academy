import { NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAssignRole, requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: Request) {
  const denied = await requirePermissionResponse(PERMISSIONS.HRM_VIEW);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");

  const staff = await db.staffProfile.findMany({
    where: { ...(stationId ? { stationId } : {}) },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true, role: { select: { id: true, name: true } } } },
      station: { select: { name: true } },
    },
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json(staff);
}

/**
 * Creates the staff member together with their login. The staff member is a
 * new person, not an existing account picked from a list — the old form listed
 * every user, players' parents included, and tied the staff profile to one of
 * them. The role chosen here decides which sidebar modules they can open.
 */
export async function POST(req: Request) {
  const denied = await requirePermissionResponse(PERMISSIONS.HRM_MANAGE);
  if (denied) return denied;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { stationId, phone, nationalId, hireDate, baseSalary, salaryType, bankAccount } = body;
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const roleId = body.roleId ? String(body.roleId) : "";

  if (!fullName || !email || !roleId) return NextResponse.json({ error: "Full name, email and role are required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  if (!(await canAssignRole(session.user.id, roleId))) {
    return NextResponse.json({ error: "You cannot assign a role with more access than your own" }, { status: 403 });
  }
  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  }

  const role = await db.role.findUnique({ where: { id: roleId }, select: { name: true } });
  const hashed = await hashPassword(password);

  const profile = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: fullName, email, password: hashed, roleId, isActive: true } });
    // station_staff is what location-scoped permissions authorise against.
    if (stationId) await tx.stationStaff.create({ data: { stationId, userId: user.id, role: role?.name ?? null } });
    return tx.staffProfile.create({
      data: {
        userId: user.id,
        stationId: stationId ?? null,
        fullName,
        role: role?.name ?? null,
        phone: phone || null,
        nationalId: nationalId || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        baseSalary: baseSalary ? Number(baseSalary) : null,
        salaryType: salaryType ?? "monthly",
        bankAccount: bankAccount || null,
      },
    });
  });
  return NextResponse.json(profile, { status: 201 });
}
