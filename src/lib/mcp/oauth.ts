import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OPEN_CORS } from "@/lib/mcp/origin";
import { hashToken, safeEqual } from "@/lib/mcp/tokens";

/** RFC 6749 §5.2 error body. */
export function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { ...OPEN_CORS, "Cache-Control": "no-store" } },
  );
}

/**
 * Redirect URIs a client may register: https anywhere (claude.ai's callback),
 * or plain http on loopback only (Claude Code's local callback listener).
 */
export function isAllowedRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Exact match against a registered URI, except that a loopback URI may differ
 * in port (RFC 8252 §7.3) — native clients pick a free port per run.
 */
export function redirectMatches(registered: string[], uri: string): boolean {
  if (registered.includes(uri)) return true;
  try {
    const u = new URL(uri);
    if (u.protocol !== "http:") return false;
    return registered.some((r) => {
      const v = new URL(r);
      return v.protocol === "http:" && v.hostname === u.hostname && v.pathname === u.pathname && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
    });
  } catch {
    return false;
  }
}

/** Token-endpoint body: form-encoded per spec, JSON tolerated. */
export async function readParams(req: NextRequest): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v ?? "")]));
  }
  const form = new URLSearchParams(await req.text());
  return Object.fromEntries(form.entries());
}

/**
 * Identify the client at the token endpoint. Public clients send only
 * client_id; confidential ones prove their secret (post body or Basic auth).
 */
export async function authenticateClient(req: NextRequest, params: Record<string, string>) {
  let clientId = params.client_id;
  let secret = params.client_secret;
  const basic = /^Basic\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  if (basic) {
    const [id, s] = Buffer.from(basic[1], "base64").toString().split(":");
    clientId = decodeURIComponent(id ?? "");
    secret = decodeURIComponent(s ?? "");
  }
  if (!clientId) return null;
  const client = await db.aiOAuthClient.findUnique({ where: { clientId } });
  if (!client) return null;
  if (client.clientSecretHash && !(secret && safeEqual(hashToken(secret), client.clientSecretHash))) return null;
  return client;
}
