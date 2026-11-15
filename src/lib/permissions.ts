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

  // A session is a signed JWT that outlives deactivation; checking here is what
  // makes "deactivate" take effect on the next request rather than at expiry.
  if (!user?.role || !user.isActive) return [];
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
    return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }
  const allowed = await hasPermission(session.user.id, permission);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Guard for back-office endpoints that every staff member legitimately needs
 * (dashboard counters, station picker) and that no single module owns. A
 * signed-in user with no permissions at all — a player or parent login, or a
 * deactivated account — is refused. Returns the session and the caller's
 * permissions so the handler can trim what it returns.
 */
export async function requireBackOfficeResponse(): Promise<
  { denied: NextResponse; session: null; permissions: null } | { denied: null; session: Session; permissions: string[] }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { denied: NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 }), session: null, permissions: null };
  }
  const permissions = await getUserPermissions(session.user.id);
  if (!permissions.length) {
    return { denied: NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 }), session: null, permissions: null };
  }
  return { denied: null, session, permissions };
}

/** `held` from getUserPermissions(): true for "*" or an exact match. */
export function holds(held: string[], permission: string): boolean {
  return held.includes("*") || held.includes(permission);
}

/**
 * requirePermissionResponse for endpoints shared by several screens: passes
 * when the caller holds any one of `permissions`.
 */
export async function requireAnyPermissionResponse(...permissions: string[]): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }
  const held = await getUserPermissions(session.user.id);
  if (!permissions.some((p) => holds(held, p))) {
    return NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Whether `callerId` may give someone `roleId`. A caller can hand out only a
 * role whose permissions they already hold themselves — otherwise anyone who
 * can create staff could mint a Super Admin account and walk through every
 * other gate. Super Admin itself is assignable only by a Super Admin.
 */
export async function canAssignRole(callerId: string, roleId: string): Promise<boolean> {
  const [held, role] = await Promise.all([
    getUserPermissions(callerId),
    db.role.findUnique({ where: { id: roleId }, include: { permissions: { include: { permission: true } } } }),
  ]);
  if (!role) return false;
  if (held.includes("*")) return true;
  if (role.name === "Super Admin") return false;
  return role.permissions.every((rp) => held.includes(rp.permission.name));
}

/**
 * Whether `callerId` may act on an account that currently holds `roleId`
 * (edit it, reset its password, deactivate or delete it). Same rule as
 * assigning: an Admin must not be able to take over a Super Admin by resetting
 * their password, or lock them out by deactivating them.
 */
export async function canManageHolderOf(callerId: string, roleId: string | null | undefined): Promise<boolean> {
  return !roleId || canAssignRole(callerId, roleId);
}

/**
 * Rewrites a role's permission set on behalf of `callerId`, refusing to hand
 * out anything the caller does not hold.
 *
 * Super Admin may set anything. Anyone else (holding roles:edit) may only add
 * or remove permissions they hold themselves; permissions they do not hold
 * keep whatever state they had on the role. Without this, roles:edit alone was
 * enough to grant one's own role every permission in the system.
 *
 * Returns the permission ids the role ends up with, or an error naming why
 * the request was refused.
 */
export async function resolveRolePermissionIds(
  callerId: string,
  requestedIds: string[],
  currentIds: string[],
): Promise<{ ids: string[] } | { error: string }> {
  const held = await getUserPermissions(callerId);
  const unique = [...new Set(requestedIds)];
  const known = await db.permission.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
  if (known.length !== unique.length) return { error: "Unknown permission" };
  if (held.includes("*")) return { ids: unique };

  const all = await db.permission.findMany({ select: { id: true, name: true } });
  const heldIds = new Set(all.filter((p) => held.includes(p.name)).map((p) => p.id));
  const current = new Set(currentIds);
  if (unique.some((id) => !heldIds.has(id) && !current.has(id))) {
    return { error: "You cannot grant a permission you do not hold" };
  }
  const keptUnheld = currentIds.filter((id) => !heldIds.has(id));
  const chosenHeld = unique.filter((id) => heldIds.has(id));
  return { ids: [...new Set([...keptUnheld, ...chosenHeld])] };
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
    return { denied: NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 }), session: null };
  }
  if (!(await hasPermission(session.user.id, permission))) {
    return { denied: NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 }), session: null };
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
