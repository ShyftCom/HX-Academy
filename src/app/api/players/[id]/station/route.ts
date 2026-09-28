import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

/**
 * Moving a player between stations is an academy administrative act, not
 * player self-service — unlike GET/PUT on this resource there is no "own
 * record" branch here, matching the status/password PATCH above it.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.PLAYERS_EDIT);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const stationId = (body?.stationId || null) as string | null;

  try {
    const [player, toStation] = await Promise.all([
      db.player.findUnique({ where: { id }, include: { station: true } }),
      stationId ? db.station.findUnique({ where: { id: stationId } }) : Promise.resolve(null),
    ]);

    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    if (stationId && !toStation) return NextResponse.json({ error: "Station not found" }, { status: 404 });
    if (player.stationId === stationId) return NextResponse.json(player);

    const fromStation = player.station;
    const updated = await db.player.update({ where: { id }, data: { stationId }, include: { station: true } });

    await logActivity({
      userId: session.user.id,
      action: "station_change",
      module: "players",
      description: `Transferred player ${player.fullName}: ${fromStation?.name ?? "None"} → ${toStation?.name ?? "None"}`,
      metadata: { playerId: id, from: fromStation?.name ?? null, to: toStation?.name ?? null },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Station transfer failed" }, { status: 500 });
  }
}
