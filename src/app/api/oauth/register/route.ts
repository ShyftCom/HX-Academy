import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OPEN_CORS } from "@/lib/mcp/origin";
import { isAllowedRedirectUri, oauthError } from "@/lib/mcp/oauth";
import { hashToken, newToken } from "@/lib/mcp/tokens";

/**
 * Dynamic client registration (RFC 7591). Claude registers itself here the
 * first time someone adds the connector. Registering grants nothing: every
 * connection still needs a staff member to sign in and approve it.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return oauthError("invalid_client_metadata", "Body must be JSON");

  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String) : [];
  if (redirectUris.length === 0 || redirectUris.length > 10) {
    return oauthError("invalid_redirect_uri", "Provide between 1 and 10 redirect_uris");
  }
  if (redirectUris.some((u) => u.length > 2000 || !isAllowedRedirectUri(u))) {
    return oauthError("invalid_redirect_uri", "redirect_uris must be https, or http on localhost");
  }

  const authMethod = String(body.token_endpoint_auth_method ?? "none");
  if (!["none", "client_secret_post", "client_secret_basic"].includes(authMethod)) {
    return oauthError("invalid_client_metadata", "Unsupported token_endpoint_auth_method");
  }
  const name = String(body.client_name ?? "Claude").slice(0, 120) || "Claude";
  const clientId = newToken("hxc");
  const secret = authMethod === "none" ? null : newToken("hxs");

  await db.aiOAuthClient.create({
    data: { clientId, name, redirectUris, clientSecretHash: secret ? hashToken(secret) : null },
  });

  return NextResponse.json(
    {
      client_id: clientId,
      ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: name,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: authMethod,
    },
    { status: 201, headers: { ...OPEN_CORS, "Cache-Control": "no-store" } },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: OPEN_CORS });
}
