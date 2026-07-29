import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id: programmeId } = await params;
  try {
    const body = await req.json();
    const items: { id: string; order: number }[] = body.items ?? [];
    await Promise.all(items.map((item) => db.programmeSchedule.update({ where: { id: item.id, programmeId }, data: { order: item.order } })));
    return NextResponse.json({ message: "Reordered" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Reorder failed" }, { status: 500 });
  }
}
