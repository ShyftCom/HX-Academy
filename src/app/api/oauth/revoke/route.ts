import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OPEN_CORS } from "@/lib/mcp/origin";
import { readParams } from "@/lib/mcp/oauth";
import { hashToken } from "@/lib/mcp/tokens";

/**
 * Token revocation (RFC 7009). Either token revokes the whole connection.
 * Always 200, so the endpoint can't be used to probe which tokens exist.
 */
export async function POST(req: NextRequest) {
  const params = await readParams(req);
  const hash = hashToken(params.token ?? "");
  await db.aiConnection.updateMany({
    where: { OR: [{ accessTokenHash: hash }, { refreshTokenHash: hash }], revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return new NextResponse(null, { status: 200, headers: OPEN_CORS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: OPEN_CORS });
}
