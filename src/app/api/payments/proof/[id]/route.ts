import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

/**
 * Serves a stored payment proof to the person who uploaded it, or to staff
 * who can view payments.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const file = await db.paymentProofFile.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (file.uploadedBy !== session.user.id && !(await hasPermission(session.user.id, PERMISSIONS.PAYMENTS_VIEW))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const download = req.nextUrl.searchParams.get("download") === "1";
  return new NextResponse(Buffer.from(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.data.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${file.fileName.replace(/"/g, "")}"`,
      // Defence in depth: never sniff into something executable, and never
      // run script even if a file somehow were.
      "X-Content-Type-Options": "nosniff",
      // Chrome won't render a PDF in a sandboxed document, so only images get it.
      "Content-Security-Policy": file.mimeType === "application/pdf"
        ? "default-src 'none'; object-src 'self'"
        : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
