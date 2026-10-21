import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { OPEN_CORS } from "@/lib/mcp/origin";
import { authenticateClient, oauthError, readParams, redirectMatches } from "@/lib/mcp/oauth";
import { ACCESS_TTL_SECONDS, REFRESH_TTL_DAYS, displayPrefix, hashToken, newToken, verifyPkce } from "@/lib/mcp/tokens";

function issue() {
  const access = newToken("hxa");
  const refresh = newToken("hxr");
  return {
    access,
    refresh,
    data: {
      accessTokenHash: hashToken(access),
      tokenPrefix: displayPrefix(access),
      accessExpiresAt: new Date(Date.now() + ACCESS_TTL_SECONDS * 1000),
      refreshTokenHash: hashToken(refresh),
      refreshExpiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000),
    },
  };
}

function tokenResponse(access: string, refresh: string) {
  return NextResponse.json(
    { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_SECONDS, refresh_token: refresh, scope: "hx" },
    { headers: { ...OPEN_CORS, "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
}

/** OAuth token endpoint: authorization_code (with PKCE) and refresh_token. */
export async function POST(req: NextRequest) {
  const params = await readParams(req);
  const client = await authenticateClient(req, params);
  if (!client) return oauthError("invalid_client", "Unknown client or bad credentials", 401);

  if (params.grant_type === "authorization_code") {
    const code = await db.aiOAuthCode.findUnique({ where: { codeHash: hashToken(params.code ?? "") } });
    // Single use: deleted before anything else can go wrong, so a replayed code never works twice.
    if (code) await db.aiOAuthCode.delete({ where: { id: code.id } }).catch(() => {});
    if (!code || code.clientId !== client.id || code.expiresAt < new Date()) {
      return oauthError("invalid_grant", "Authorization code is invalid or expired");
    }
    if (!redirectMatches([code.redirectUri], params.redirect_uri ?? "")) {
      return oauthError("invalid_grant", "redirect_uri does not match the authorization request");
    }
    if (!verifyPkce(params.code_verifier ?? "", code.codeChallenge)) {
      return oauthError("invalid_grant", "PKCE verification failed");
    }

    const t = issue();
    const conn = await db.aiConnection.create({
      data: { name: code.name, kind: "oauth", userId: code.userId, clientId: client.id, readOnly: code.readOnly, ...t.data },
    });
    await logActivity({
      userId: code.userId,
      action: "create",
      module: "ai",
      description: `Connected Claude: ${conn.name}${conn.readOnly ? " (read-only)" : ""}`,
      metadata: { connectionId: conn.id, client: client.name },
    });
    return tokenResponse(t.access, t.refresh);
  }

  if (params.grant_type === "refresh_token") {
    const conn = await db.aiConnection.findUnique({ where: { refreshTokenHash: hashToken(params.refresh_token ?? "") } });
    if (!conn || conn.revokedAt || conn.clientId !== client.id || !conn.refreshExpiresAt || conn.refreshExpiresAt < new Date()) {
      return oauthError("invalid_grant", "Refresh token is invalid, expired or revoked");
    }
    // Rotation: the old refresh token stops working the moment the new one exists.
    const t = issue();
    await db.aiConnection.update({ where: { id: conn.id }, data: t.data });
    return tokenResponse(t.access, t.refresh);
  }

  return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token");
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: OPEN_CORS });
}
