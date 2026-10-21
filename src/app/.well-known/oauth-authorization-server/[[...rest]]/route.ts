import { NextRequest, NextResponse } from "next/server";
import { OPEN_CORS, requestOrigin } from "@/lib/mcp/origin";

/**
 * OAuth authorization-server metadata (RFC 8414). HX Academy is its own
 * authorization server: staff sign in with their back-office account on
 * /oauth/authorize and approve the connection there.
 */
export function GET(req: NextRequest) {
  const origin = requestOrigin(req);
  return NextResponse.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/api/oauth/token`,
      registration_endpoint: `${origin}/api/oauth/register`,
      revocation_endpoint: `${origin}/api/oauth/revoke`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
      scopes_supported: ["hx"],
    },
    { headers: OPEN_CORS },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: OPEN_CORS });
}
