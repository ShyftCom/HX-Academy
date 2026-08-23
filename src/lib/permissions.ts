import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PERMISSIONS as PERMISSION_NAMES } from "@/lib/permission-names";

export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  if (!user?.role) return [];
  if (user.role.name === "Super Admin") return ["*"];

  return user.role.permissions.map((rp) => rp.permission.name);
}

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  if (permissions.includes("*")) return true;
  return permissions.includes(permission);
}

export async function requirePermission(permission: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  const allowed = await hasPermission(session.user.id, permission);
  if (!allowed) {
    throw new Error("Forbidden");
  }
  return session;
}

/**
 * Route-handler-friendly variant: returns `null` when the caller is
 * authorized, or a ready-to-return NextResponse (401/403) otherwise —
 * `const denied = await requirePermissionResponse(...); if (denied) return denied;`
 * avoids every route re-implementing its own try/catch around requirePermission().
 */
export async function requirePermissionResponse(permission: string): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await hasPermission(session.user.id, permission);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * The stations a user may act on, or "all".
 *
 * Location scoping is *positive*: a user reaches every location only by holding
 * schedule:manage_all (or "*"). Everyone else is confined to their station_staff
 * rows — and a user with no rows reaches nothing. The alternative, treating "no
 * assignments" as "unrestricted", would mean unassigning a scoped admin's last
 * station silently promoted them to global access.
 *
 * station_staff has existed since the initial schema but was display-only until
 * now; this is the first thing to authorize against it.
 */
export async function getAccessibleStationIds(userId: string): Promise<string[] | "all"> {
  const permissions = await getUserPermissions(userId);
  if (permissions.includes("*") || permissions.includes(PERMISSION_NAMES.SCHEDULE_MANAGE_ALL)) return "all";

  const assignments = await db.stationStaff.findMany({ where: { userId }, select: { stationId: true } });
  return assignments.map((a) => a.stationId);
}

export async function canAccessStation(userId: string, stationId: string): Promise<boolean> {
  const allowed = await getAccessibleStationIds(userId);
  return allowed === "all" || allowed.includes(stationId);
}

/**
 * Route-handler guard for a location-scoped resource: checks the capability
 * (`permission`) and then the location (`stationId`), returning a ready-to-return
 * response when either fails.
 *
 * A caller who may not see the station gets 404, not 403 — a location-scoped
 * admin should not be able to enumerate other branches by watching status codes.
 */
export async function requireStationAccessResponse(
  permission: string,
  stationId: string,
): Promise<{ denied: NextResponse; session: null } | { denied: null; session: Session }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  if (!(await hasPermission(session.user.id, permission))) {
    return { denied: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  if (!(await canAccessStation(session.user.id, stationId))) {
    return { denied: NextResponse.json({ error: "Not found" }, { status: 404 }), session: null };
  }
  return { denied: null, session };
}

// Re-exported from the client-safe constants module so the enforcement path
// (this file) and the presentation path (sidebar, dashboards) can never drift
// onto different spellings. See src/lib/permission-names.ts for why it is split.
export { PERMISSIONS, type PermissionName } from "@/lib/permission-names";
