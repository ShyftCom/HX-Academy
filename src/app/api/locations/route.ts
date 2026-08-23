import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PERMISSIONS, getAccessibleStationIds, hasPermission } from "@/lib/permissions";

/**
 * The locations the current user may manage a schedule for — the source for the
 * admin location selector.
 *
 * Deliberately not /api/stations (which lists every branch to any signed-in
 * user) nor /api/public/venues (which hides unpublished ones): a location-scoped
 * admin must see their own branches and only those, published or not.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasPermission(session.user.id, PERMISSIONS.WEBSITE_VIEW))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowed = await getAccessibleStationIds(session.user.id);
  const locations = await db.station.findMany({
    where: allowed === "all" ? {} : { id: { in: allowed } },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, wilaya: true, slug: true, status: true, isPubliclyListed: true,
      _count: { select: { scheduleSlots: true } },
    },
  });
  return NextResponse.json(locations);
}
