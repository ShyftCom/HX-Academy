import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { redirectMatches } from "@/lib/mcp/oauth";
import { CODE_TTL_SECONDS, hashToken, newToken } from "@/lib/mcp/tokens";

/**
 * Back end of the consent screen at /oauth/authorize. Cookie-authenticated:
 * the person approving is the signed-in staff member, and the connection will
 * act as them. Not CORS-enabled, so only our own page can call it.
 *
 * An invalid client_id or redirect_uri is reported to the page and never
 * redirected to — sending a code or even an error to an unverified URI is how
 * open redirects and code theft happen (RFC 6749 §4.1.2.1).
 */
async function loadClient(clientId: string | null, redirectUri: string | null) {
  if (!clientId || !redirectUri) return null;
  const client = await db.aiOAuthClient.findUnique({ where: { clientId } });
  if (!client || !redirectMatches(client.redirectUris, redirectUri)) return null;
  return client;
}

async function caller() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!(await hasPermission(session.user.id, PERMISSIONS.AI_CONNECT))) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { userId: session.user.id };
}

/** What the consent screen shows: which app is asking and where it will send you back. */
export async function GET(req: NextRequest) {
  const c = await caller();
  if (c.error) return c.error;
  const sp = req.nextUrl.searchParams;
  const client = await loadClient(sp.get("client_id"), sp.get("redirect_uri"));
  if (!client) return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  return NextResponse.json({ clientName: client.name, redirectHost: new URL(sp.get("redirect_uri")!).host });
}

const decisionSchema = z.object({
  client_id: z.string(),
  redirect_uri: z.string(),
  state: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.string().optional(),
  approve: z.boolean(),
  name: z.string().trim().min(1).max(120).optional(),
  readOnly: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const c = await caller();
  if (c.error) return c.error;
  const parsed = decisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const d = parsed.data;

  const client = await loadClient(d.client_id, d.redirect_uri);
  if (!client) return NextResponse.json({ error: "invalid_client" }, { status: 400 });

  const back = new URL(d.redirect_uri);
  if (d.state) back.searchParams.set("state", d.state);

  if (!d.approve) {
    back.searchParams.set("error", "access_denied");
    return NextResponse.json({ redirect: back.toString() });
  }
  // PKCE is mandatory (OAuth 2.1) — without it a stolen code is a stolen account.
  if (!d.code_challenge || d.code_challenge_method !== "S256") {
    back.searchParams.set("error", "invalid_request");
    back.searchParams.set("error_description", "PKCE with S256 is required");
    return NextResponse.json({ redirect: back.toString() });
  }

  const code = newToken("hxa").replace("hxa_", "");
  await db.aiOAuthCode.create({
    data: {
      codeHash: hashToken(code),
      clientId: client.id,
      userId: c.userId,
      redirectUri: d.redirect_uri,
      codeChallenge: d.code_challenge,
      name: d.name ?? client.name,
      readOnly: d.readOnly,
      expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000),
    },
  });
  // Housekeeping: drop codes nobody exchanged.
  await db.aiOAuthCode.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});

  back.searchParams.set("code", code);
  return NextResponse.json({ redirect: back.toString() });
}
