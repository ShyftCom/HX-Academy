import { NextRequest, NextResponse } from "next/server";
import { OPEN_CORS, mcpResourceUrl, requestOrigin } from "@/lib/mcp/origin";

/**
 * OAuth protected-resource metadata (RFC 9728) for the MCP endpoint. Served at
 * both /.well-known/oauth-protected-resource and the path-suffixed
 * /.well-known/oauth-protected-resource/api/mcp that clients also try.
 */
export function GET(req: NextRequest) {
  const origin = requestOrigin(req);
  return NextResponse.json(
    {
      resource: mcpResourceUrl(origin),
      authorization_servers: [origin],
      bearer_methods_supported: ["header"],
      resource_name: "HX Academy",
    },
    { headers: OPEN_CORS },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: OPEN_CORS });
}
