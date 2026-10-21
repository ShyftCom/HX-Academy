import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getUserPermissions, PERMISSIONS } from "@/lib/permissions";
import { displayPrefix, hashToken, newToken } from "@/lib/mcp/tokens";

async function caller() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const perms = await getUserPermissions(session.user.id);
  const all = perms.includes("*");
  const canConnect = all || perms.includes(PERMISSIONS.AI_CONNECT);
  const canManage = all || perms.includes(PERMISSIONS.AI_MANAGE);
  if (!canConnect && !canManage) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { userId: session.user.id, canConnect, canManage };
}

/**
 * Claude connections. Your own by default; `?scope=all` lists everyone's for
 * holders of ai:manage. Revoked connections stay listed (greyed out) so the
 * history of who connected what is not lost.
 */
export async function GET(req: NextRequest) {
  const c = await caller();
  if (c.error) return c.error;
  const all = c.canManage && req.nextUrl.searchParams.get("scope") === "all";

  const rows = await db.aiConnection.findMany({
    where: all ? {} : { userId: c.userId },
    orderBy: [{ revokedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    select: {
      id: true, name: true, kind: true, readOnly: true, tokenPrefix: true, lastUsedAt: true,
      revokedAt: true, createdAt: true, refreshExpiresAt: true,
      user: { select: { id: true, name: true, email: true } },
      client: { select: { name: true } },
    },
    take: 500,
  });
  return NextResponse.json({ data: rows, canManage: c.canManage, canConnect: c.canConnect });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  readOnly: z.boolean().default(false),
});

/**
 * A personal access token, for MCP clients configured by hand (Claude Code
 * with a header, scripts) rather than through the OAuth consent screen. The
 * token is returned exactly once.
 */
export async function POST(req: NextRequest) {
  const c = await caller();
  if (c.error) return c.error;
  if (!c.canConnect) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const token = newToken("hxp");
  const conn = await db.aiConnection.create({
    data: {
      name: parsed.data.name,
      kind: "token",
      userId: c.userId,
      readOnly: parsed.data.readOnly,
      accessTokenHash: hashToken(token),
      tokenPrefix: displayPrefix(token),
    },
  });
  await logActivity({
    userId: c.userId,
    action: "create",
    module: "ai",
    description: `Created Claude access token: ${conn.name}${conn.readOnly ? " (read-only)" : ""}`,
    metadata: { connectionId: conn.id },
  });
  return NextResponse.json({ id: conn.id, token }, { status: 201 });
}
