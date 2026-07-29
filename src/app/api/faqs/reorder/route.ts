import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function PUT(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;
  try {
    const body = await req.json();
    const items: { id: string; order: number }[] = body.items ?? [];
    await Promise.all(items.map((item) => db.faq.update({ where: { id: item.id }, data: { order: item.order } })));
    return NextResponse.json({ message: "Reordered" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Reorder failed" }, { status: 500 });
  }
}
