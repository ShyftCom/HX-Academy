import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  // The catalogue the roles screen builds its permission matrix from.
  const denied = await requirePermissionResponse(PERMISSIONS.ROLES_VIEW);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await db.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
  return NextResponse.json(permissions);
}
