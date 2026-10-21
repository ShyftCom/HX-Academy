import { NextRequest, NextResponse } from "next/server";
import { authenticateBearer } from "@/lib/mcp/tokens";
import { handleRpc } from "@/lib/mcp/server";
import { OPEN_CORS, requestOrigin } from "@/lib/mcp/origin";

// Tool calls proxy to other API routes; give a slow report room to finish.
export const maxDuration = 60;

/**
 * MCP endpoint — the URL people paste into Claude as a custom connector.
 * An unauthenticated request gets a 401 pointing at the protected-resource
 * metadata, which is how Claude discovers the OAuth flow (RFC 9728).
 */
function unauthorized(req: NextRequest) {
  const metadata = `${requestOrigin(req)}/.well-known/oauth-protected-resource/api/mcp`;
  return NextResponse.json(
    { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } },
    { status: 401, headers: { ...OPEN_CORS, "WWW-Authenticate": `Bearer resource_metadata="${metadata}"` } },
  );
}

export async function POST(req: NextRequest) {
  const caller = await authenticateBearer(req);
  if (!caller) return unauthorized(req);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: OPEN_CORS });
  }

  const origin = requestOrigin(req);
  const messages = Array.isArray(payload) ? payload : [payload];
  const replies = (await Promise.all(messages.map((m) => handleRpc(m, caller, origin)))).filter(Boolean);

  // Only notifications/responses in the request: accepted, nothing to say.
  if (replies.length === 0) return new NextResponse(null, { status: 202, headers: OPEN_CORS });
  return NextResponse.json(Array.isArray(payload) ? replies : replies[0], { headers: OPEN_CORS });
}

// Stateless server: no server-initiated SSE stream and no sessions to end.
export async function GET(req: NextRequest) {
  if (!(await authenticateBearer(req))) return unauthorized(req);
  return new NextResponse(null, { status: 405, headers: { ...OPEN_CORS, Allow: "POST" } });
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { ...OPEN_CORS, Allow: "POST" } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: OPEN_CORS });
}
