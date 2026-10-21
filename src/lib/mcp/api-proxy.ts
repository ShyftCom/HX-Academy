import { encode } from "next-auth/jwt";
import { appUrl } from "@/lib/app-url";
import type { McpCaller } from "@/lib/mcp/tokens";

/**
 * Run a back-office API call as the connection's user.
 *
 * Claude does not get a parallel set of handlers with their own rules. It
 * calls the very same /api routes the dashboard calls, carrying a short-lived
 * session for the user who authorized it — so role permissions, station
 * scoping, validation and activity logging all apply exactly as they do when
 * that person clicks through the back office, and nothing here can drift from
 * them.
 */

/** Routes Claude may not reach: auth plumbing, its own credentials, webhooks and uploads. */
const BLOCKED_PREFIXES = [
  "/api/auth/",
  "/api/oauth/",
  "/api/mcp",
  "/api/ai-connections",
  "/api/cron/",
  "/api/register",
  "/api/upload",
  "/api/public/upload",
  "/api/payments/slickpay/webhook",
  "/api/payments/slickpay/return",
];

export function blockedReason(path: string): string | null {
  if (!/^\/api\/[A-Za-z0-9_\-/.%]+$/.test(path) || path.includes("..") || path.includes("//")) {
    return "Path must look like /api/<resource>[/<id>…] with no query string (pass query separately).";
  }
  if (BLOCKED_PREFIXES.some((p) => path === p.replace(/\/$/, "") || path.startsWith(p))) {
    return "This endpoint is not available to Claude.";
  }
  return null;
}

/**
 * Where to send the self-call. The minted cookie is a real session, so it may
 * only go to a host that is this deployment: the host the request came in on
 * when it is one we recognise, otherwise the configured app URL (both of the
 * academy's domains serve the same deployment, so that is always correct).
 */
function selfOrigin(requestOrigin: string): string {
  const known = new Set(
    [
      appUrl(),
      process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
      process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
      ...(process.env.MCP_ALLOWED_ORIGINS ?? "").split(","),
    ]
      .filter(Boolean)
      .map((o) => new URL(o as string).host),
  );
  const host = new URL(requestOrigin).host;
  if (known.has(host) || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return requestOrigin;
  return appUrl();
}

async function sessionCookies(caller: McpCaller): Promise<string> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const token = {
    sub: caller.user.id,
    id: caller.user.id,
    name: caller.user.name,
    email: caller.user.email,
    role: caller.user.role,
    roleName: caller.user.role,
    isPlayer: false,
    playerId: null,
  };
  // Auth.js salts the JWE with the cookie name, and picks the __Secure- name on
  // https. Sending both means the call works regardless of which one it reads.
  const names = ["__Secure-authjs.session-token", "authjs.session-token"];
  const values = await Promise.all(names.map((salt) => encode({ token, secret, salt, maxAge: 120 })));
  return names.map((n, i) => `${n}=${values[i]}`).join("; ");
}

const MAX_RESPONSE_CHARS = 60_000;

export interface ApiCallInput {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
}

export async function callApiAs(caller: McpCaller, requestOrigin: string, input: ApiCallInput) {
  const blocked = blockedReason(input.path);
  if (blocked) return { ok: false, status: 400, text: blocked };
  if (caller.readOnly && input.method !== "GET") {
    return { ok: false, status: 403, text: "This Claude connection is read-only. Only GET calls are allowed." };
  }

  const url = new URL(input.path, selfOrigin(requestOrigin));
  for (const [k, v] of Object.entries(input.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = {
    cookie: await sessionCookies(caller),
    accept: "application/json",
    "x-hx-via": "claude-mcp",
  };
  let body: string | undefined;
  if (input.body !== undefined && input.method !== "GET") {
    headers["content-type"] = "application/json";
    body = JSON.stringify(input.body);
  }

  const res = await fetch(url, { method: input.method, headers, body, redirect: "manual", cache: "no-store" });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON (an HTML error page, a CSV export) — return it as text.
  }
  let serialized = typeof data === "string" ? data : JSON.stringify(data, null, 1);
  if (serialized.length > MAX_RESPONSE_CHARS) {
    serialized =
      serialized.slice(0, MAX_RESPONSE_CHARS) +
      `\n…[truncated: ${serialized.length} chars total — request a smaller page, e.g. perPage=20, or filter]`;
  }
  return { ok: res.ok, status: res.status, text: serialized };
}
