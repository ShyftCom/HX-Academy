/**
 * Who may own a lead ("Assigné à"): active accounts holding the Admin or Super
 * Admin role — the academy's sales staff. Coaches, players and parents never
 * work leads, and the old picker listed every account in the system.
 *
 * Client-safe (no imports) so pickers can share it; the server check lives in
 * src/lib/lead-assignee.ts. Role names rather than a permission because the
 * requirement is stated in roles, and the same names already drive admin
 * notifications.
 */
export const LEAD_ASSIGNEE_ROLES = ["Admin", "Super Admin"] as const;

/** The query string the pickers pass to GET /api/users. */
export const LEAD_ASSIGNEE_QUERY = `roles=${encodeURIComponent(LEAD_ASSIGNEE_ROLES.join(","))}&perPage=200`;
