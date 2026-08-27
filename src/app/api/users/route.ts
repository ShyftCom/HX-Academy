import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { getUserPermissions, hasPermission, requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import { db } from "@/lib/db";

/**
 * Two separate problems lived in this handler.
 *
 * The first is that it leaked password hashes. The query uses `include` with no
 * `select`, and Prisma then returns every scalar column — `password` among
 * them. Every other handler that returns a user strips it (POST below, and both
 * of the [id] handlers), so this was an oversight rather than a decision, but
 * on `auth()` alone it meant any signed-in user could read the bcrypt hash of
 * every account in the academy and take them offline to crack.
 *
 * The second is that the route cannot simply require users:view. It backs the
 * "assign to" dropdowns on the leads, tickets, HRM, affiliates and calendar
 * screens, and those are reached with their own permissions — Staff hold
 * leads:view and no users:view at all, so gating on users:view alone would
 * break lead assignment.
 *
 * So the caller's standing decides the shape of the answer, not merely whether
 * there is one:
 *
 *   users:view      the full directory, minus the password
 *   any permission  a name-and-role list, enough to populate a dropdown
 *   none            403 — the Player role is granted no permissions at all,
 *                   which is precisely the caller this route must refuse
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canSeeDirectory = await hasPermission(session.user.id, PERMISSIONS.USERS_VIEW);
  if (!canSeeDirectory) {
    const held = await getUserPermissions(session.user.id);
    if (held.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");

  const rolesParam = searchParams.get("roles");
  const includeAvailability = searchParams.get("include_availability") === "true" || !!rolesParam;

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q } }, { email: { contains: q } }];
  if (rolesParam) {
    const roleNames = rolesParam.split(",").map((r) => r.trim());
    where.role = { name: { in: roleNames } };
    where.isActive = true;
  }

  // `omit` on the full read rather than a hand-written field list, so a column
  // added to User later is included automatically and only `password` stays
  // deliberately excluded.
  const fullQuery = {
    where,
    omit: { password: true },
    include: { role: true, ...(includeAvailability && { agentAvailability: true }) },
    orderBy: { createdAt: "desc" as const },
    skip: (page - 1) * perPage,
    take: perPage,
  };

  // The dropdown shape: what a picker needs and nothing else. No email, no
  // last-login, no password — an allow-list, so a new column cannot leak here.
  const slimQuery = {
    where,
    select: {
      id: true,
      name: true,
      isActive: true,
      role: { select: { id: true, name: true } },
      ...(includeAvailability && { agentAvailability: true }),
    },
    orderBy: { createdAt: "desc" as const },
    skip: (page - 1) * perPage,
    take: perPage,
  };

  const [data, total] = await Promise.all([
    canSeeDirectory
      ? db.user.findMany(fullQuery)
      : db.user.findMany(slimQuery),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  // Creates a back-office account and assigns it a role straight from the body.
  // On auth() alone, any signed-in user — any player — could mint themselves a
  // second account holding the Super Admin role, whose id GET /api/roles was
  // equally happy to hand over. That is full privilege escalation in two
  // requests, and it made every other gate in this module bypassable.
  const denied = await requirePermissionResponse(PERMISSIONS.USERS_CREATE);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

    const hashed = await hashPassword(body.password);
    const user = await db.user.create({
      data: { name: body.name, email: body.email, password: hashed, roleId: body.roleId ?? null, isActive: body.isActive ?? true },
      include: { role: true },
    });
    const { password: _, ...safeUser } = user as any;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
