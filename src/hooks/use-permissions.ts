"use client";

import { useQuery } from "@tanstack/react-query";

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string | null;
  isPlayer: boolean;
  playerId: string | null;
  isActive: boolean;
  /** Effective permission names, or `["*"]` for Super Admin. */
  permissions: string[];
}

/**
 * The signed-in user plus their effective permissions.
 *
 * IMPORTANT — this is for *presentation* only. Use it to hide nav entries and
 * disable actions a user cannot perform, so they don't hit a dead end. It is
 * not a security boundary: anyone can edit client state. Every protected
 * operation is still gated server-side by requirePermission() /
 * requirePermissionResponse() in the route handler, and must stay that way.
 */
export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("Failed to load current user");
      return res.json();
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function usePermissions() {
  const { data, isLoading } = useCurrentUser();
  const permissions = data?.permissions ?? [];
  const isSuperAdmin = permissions.includes("*");

  /**
   * `can("leads:view")` — true when the user holds that permission.
   *
   * While the request is in flight this returns `true`. Rendering a nav item
   * that later disappears is a far smaller failure than flashing an empty
   * sidebar on every page load, and the server rejects anything unauthorised
   * regardless of what the shell chose to draw.
   */
  const can = (permission?: string | string[]) => {
    if (!permission) return true;
    if (isLoading) return true;
    if (isSuperAdmin) return true;
    const needed = Array.isArray(permission) ? permission : [permission];
    return needed.some((p) => permissions.includes(p));
  };

  return { can, permissions, isSuperAdmin, isLoading, user: data, role: data?.role ?? null };
}
