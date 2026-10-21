import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getUserPermissions, PERMISSIONS } from "@/lib/permissions";

/**
 * Revoke a connection. Soft: the row stays for the audit trail, and both of
 * its tokens stop working on the next request. Anyone may revoke their own;
 * ai:manage may revoke anyone's.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const conn = await db.aiConnection.findUnique({ where: { id } });
  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conn.userId !== session.user.id) {
    const perms = await getUserPermissions(session.user.id);
    if (!perms.includes("*") && !perms.includes(PERMISSIONS.AI_MANAGE)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }
  if (!conn.revokedAt) {
    await db.aiConnection.update({ where: { id }, data: { revokedAt: new Date() } });
    await logActivity({
      userId: session.user.id,
      action: "delete",
      module: "ai",
      description: `Revoked Claude connection: ${conn.name}`,
      metadata: { connectionId: id, ownerId: conn.userId },
    });
  }
  return NextResponse.json({ ok: true });
}
