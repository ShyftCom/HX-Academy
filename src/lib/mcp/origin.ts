import type { NextRequest } from "next/server";

/**
 * The origin the client reached us on. OAuth metadata, the resource URL and the
 * self-calls in api-proxy.ts all derive from it, so a flow that starts on one
 * of the academy's domains stays on that domain throughout.
 */
export function requestOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  if (host) return `${proto ?? req.nextUrl.protocol.replace(":", "")}://${host}`;
  return req.nextUrl.origin;
}

export function mcpResourceUrl(origin: string): string {
  return `${origin}/api/mcp`;
}

/** Bearer-token endpoints carry no cookies, so any origin may call them. */
export const OPEN_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};
