import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.CHARGES_EDIT);
  if (denied) return denied;
  const { id } = await params;
  await db.chargeCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
