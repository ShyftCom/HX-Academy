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

export const PERMISSIONS = {
  // Leads
  LEADS_VIEW: "leads:view",
  LEADS_CREATE: "leads:create",
  LEADS_EDIT: "leads:edit",
  LEADS_DELETE: "leads:delete",
  LEADS_CONVERT: "leads:convert",
  // Players
  PLAYERS_VIEW: "players:view",
  PLAYERS_CREATE: "players:create",
  PLAYERS_EDIT: "players:edit",
  PLAYERS_DELETE: "players:delete",
  // Subscriptions
  SUBS_VIEW: "subscriptions:view",
  SUBS_CREATE: "subscriptions:create",
  SUBS_EDIT: "subscriptions:edit",
  SUBS_DELETE: "subscriptions:delete",
  // Payments
  PAYMENTS_VIEW: "payments:view",
  PAYMENTS_APPROVE: "payments:approve",
  PAYMENTS_REJECT: "payments:reject",
  PAYMENTS_CREATE: "payments:create",
  // Store
  STORE_VIEW: "store:view",
  STORE_CREATE: "store:create",
  STORE_EDIT: "store:edit",
  STORE_DELETE: "store:delete",
  // Orders
  ORDERS_VIEW: "orders:view",
  ORDERS_EDIT: "orders:edit",
  ORDERS_DELETE: "orders:delete",
  // Reports
  REPORTS_VIEW: "reports:view",
  // Settings
  SETTINGS_VIEW: "settings:view",
  SETTINGS_EDIT: "settings:edit",
  // Users
  USERS_VIEW: "users:view",
  USERS_CREATE: "users:create",
  USERS_EDIT: "users:edit",
  USERS_DELETE: "users:delete",
  // Roles
  ROLES_VIEW: "roles:view",
  ROLES_CREATE: "roles:create",
  ROLES_EDIT: "roles:edit",
  ROLES_DELETE: "roles:delete",
} as const;
