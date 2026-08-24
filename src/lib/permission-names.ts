/**
 * Permission name constants — client-safe.
 *
 * Deliberately split out of `@/lib/permissions`. That module imports the
 * Prisma client and NextAuth in order to *evaluate* permissions server-side;
 * importing it from a client component (the sidebar, a dashboard page) pulls
 * `pg` into the browser bundle and fails the build with
 * "Module not found: Can't resolve 'tls'".
 *
 * This file is data only, with no imports, so both sides can share it:
 *   - client  — hide nav entries and disable actions the user cannot use
 *   - server  — `@/lib/permissions` re-exports PERMISSIONS from here, so the
 *               enforcement path and the presentation path can never drift
 *               onto different spellings of the same permission name.
 *
 * Hiding a control is never authorisation. Every protected route still calls
 * requirePermission() / requirePermissionResponse().
 */
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
  // Website & Applications
  WEBSITE_VIEW: "website:view",
  WEBSITE_EDIT: "website:edit",
  /**
   * Schedules are location-scoped. website:view/website:edit still decide
   * *whether* a user may read or edit a schedule at all; this one decides
   * *whose* — holders reach every location, everyone else is confined to the
   * stations they are assigned to in station_staff.
   *
   * Super Admin has it implicitly via "*", and the seed grants it to Admin
   * along with every other permission, so existing installs keep the reach
   * they had before schedules became location-scoped.
   */
  SCHEDULE_MANAGE_ALL: "schedule:manage_all",
  APPLICATIONS_VIEW: "applications:view",
  APPLICATIONS_MANAGE: "applications:manage",
  APPLICATIONS_EXPORT: "applications:export",
  FILE_REQUIREMENTS_MANAGE: "file_requirements:manage",
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
