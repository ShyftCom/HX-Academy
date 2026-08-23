import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PERMISSIONS, canAccessStation, requirePermissionResponse } from "@/lib/permissions";

/**
 * Ordering inside one programme's schedule tab. The rows can span several
 * locations, so each one is authorized against its own station and silently
 * dropped when the caller cannot reach it.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: programmeId } = await params;
  try {
    const body = await req.json();
    const items: { id: string; order: number }[] = body.items ?? [];
    const slots = await db.scheduleSlot.findMany({
      where: { programmeId, id: { in: items.map((i) => i.id) } },
      select: { id: true, stationId: true },
    });

    const writable = new Set<string>();
    for (const slot of slots) {
      if (await canAccessStation(userId, slot.stationId)) writable.add(slot.id);
    }

    await db.$transaction(items.filter((i) => writable.has(i.id)).map((i) => db.scheduleSlot.update({ where: { id: i.id }, data: { order: i.order } })));
    return NextResponse.json({ message: "Reordered" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Reorder failed" }, { status: 500 });
  }
}
