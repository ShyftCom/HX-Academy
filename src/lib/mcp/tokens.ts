import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserPermissions, PERMISSIONS } from "@/lib/permissions";

/**
 * Tokens for Claude (MCP) connections.
 *
 * Only sha256 hashes are stored. A token is shown once — on the consent
 * redirect to Claude, or in the "create access token" dialog — and never again.
 * The prefixes make a leaked string recognisable in logs and secret scanners:
 *   hxa_  OAuth access token   (1 hour)
 *   hxr_  OAuth refresh token  (rotated on every use)
 *   hxp_  personal access token (until revoked)
 */
export const ACCESS_TTL_SECONDS = 60 * 60;
export const REFRESH_TTL_DAYS = 90;
export const CODE_TTL_SECONDS = 10 * 60;

export function newToken(prefix: "hxa" | "hxr" | "hxp" | "hxc" | "hxs"): string {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** PKCE S256: base64url(sha256(verifier)) must equal the stored challenge. */
export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
  return safeEqual(createHash("sha256").update(verifier).digest("base64url"), challenge);
}

/** Shown in the back office next to each connection: "hxp_Ab3d…". */
export function displayPrefix(token: string): string {
  return token.slice(0, 8);
}

export interface McpCaller {
  connectionId: string;
  connectionName: string;
  readOnly: boolean;
  user: { id: string; name: string | null; email: string; role: string | null };
  permissions: string[];
}

/**
 * Resolve `Authorization: Bearer …` to the staff member Claude acts as.
 *
 * Re-checked on every request rather than trusted from issuance, so each of
 * these takes effect immediately on live connections: revoking the
 * connection, deactivating the user, or taking ai:connect away from their role.
 */
export async function authenticateBearer(req: NextRequest): Promise<McpCaller | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) return null;

  const conn = await db.aiConnection.findUnique({
    where: { accessTokenHash: hashToken(match[1]) },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true, role: { select: { name: true } }, _count: { select: { players: true } } } },
    },
  });
  if (!conn || conn.revokedAt) return null;
  if (conn.accessExpiresAt && conn.accessExpiresAt < new Date()) return null;
  // Player/parent logins never reach the back office, so never reach it through Claude either.
  if (!conn.user.isActive || conn.user._count.players > 0) return null;

  const permissions = await getUserPermissions(conn.user.id);
  if (!permissions.includes("*") && !permissions.includes(PERMISSIONS.AI_CONNECT)) return null;

  // Throttled so a busy conversation doesn't write a row per tool call.
  if (!conn.lastUsedAt || Date.now() - conn.lastUsedAt.getTime() > 60_000) {
    await db.aiConnection.update({ where: { id: conn.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }

  return {
    connectionId: conn.id,
    connectionName: conn.name,
    readOnly: conn.readOnly,
    user: { id: conn.user.id, name: conn.user.name, email: conn.user.email, role: conn.user.role?.name ?? null },
    permissions,
  };
}
