import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

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

// Re-exported from the client-safe constants module so the enforcement path
// (this file) and the presentation path (sidebar, dashboards) can never drift
// onto different spellings. See src/lib/permission-names.ts for why it is split.
export { PERMISSIONS, type PermissionName } from "@/lib/permission-names";
