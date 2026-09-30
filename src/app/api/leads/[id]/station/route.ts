import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const stationId = (body?.stationId || null) as string | null;

  try {
    const [lead, toStation] = await Promise.all([
      db.lead.findUnique({ where: { id }, include: { station: true } }),
      stationId ? db.station.findUnique({ where: { id: stationId } }) : Promise.resolve(null),
    ]);

    if (!lead) return NextResponse.json({ error: "Lead not found", code: "lead_not_found" }, { status: 404 });
    if (stationId && !toStation) return NextResponse.json({ error: "Station not found", code: "station_not_found" }, { status: 404 });
    if (lead.stationId === stationId) return NextResponse.json({ lead_id: id, station_id: stationId, updated_at: lead.updatedAt });

    const fromStation = lead.station;
    const actor = session.user as { id: string; name?: string | null; role?: string };
    const description = !fromStation
      ? `Station set to ${toStation?.name}`
      : !toStation
        ? `Station cleared (was ${fromStation.name})`
        : `Station changed from ${fromStation.name} → ${toStation.name}`;

    // Atomic: update lead + insert activity log in one transaction — same
    // shape as the status-change endpoint this mirrors.
    const [updatedLead] = await db.$transaction([
      db.lead.update({
        where: { id },
        data: { stationId },
        select: { id: true, stationId: true, updatedAt: true },
      }),
      db.leadActivity.create({
        data: {
          leadId: id,
          actionType: "station_changed",
          description,
          performedById: session.user.id,
          performedByName: actor.name ?? "Admin",
          performedByRole: actor.role ?? "admin",
          metadata: {
            from_station_id: fromStation?.id ?? null,
            from_station_name: fromStation?.name ?? null,
            to_station_id: toStation?.id ?? null,
            to_station_name: toStation?.name ?? null,
          },
        },
      }),
    ]);

    await logActivity({
      userId: session.user.id,
      action: "station_change",
      module: "leads",
      description: `Transferred lead ${lead.fullName}: ${fromStation?.name ?? "None"} → ${toStation?.name ?? "None"}`,
      metadata: { leadId: id, from: fromStation?.name ?? null, to: toStation?.name ?? null },
    });

    return NextResponse.json({ lead_id: updatedLead.id, station_id: updatedLead.stationId, updated_at: updatedLead.updatedAt });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Station transfer failed", code: "station_transfer_failed" }, { status: 500 });
  }
}
