import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());

  const [stations, totalPlayers, totalRevenue, totalLeads, totalMeetings] = await Promise.all([
    db.station.findMany({
      where: { status: "active" },
      include: {
        _count: { select: { players: true, leads: true, meetings: true } },
      },
    }),
    db.player.count(),
    db.payment.aggregate({ where: { status: "approved" }, _sum: { amount: true } }),
    db.lead.count({ where: { isConverted: false } }),
    db.meeting.count({ where: { date: { gte: weekStart.toISOString().split("T")[0] } } }),
  ]);

  const stationRows = await Promise.all(
    stations.map(async (s) => {
      const revenue = await db.payment.aggregate({
        where: { stationId: s.id, status: "approved" },
        _sum: { amount: true },
      });
      const leads = await db.lead.count({ where: { stationId: s.id, isConverted: false } });
      const converted = await db.lead.count({ where: { stationId: s.id, isConverted: true } });
      const totalLeadsForStation = leads + converted;
      return {
        id: s.id,
        name: s.name,
        wilaya: s.wilaya,
        players: s._count.players,
        revenue: revenue._sum.amount ?? 0,
        leads,
        converted,
        conversionRate: totalLeadsForStation > 0 ? Math.round((converted / totalLeadsForStation) * 100) : 0,
      };
    })
  );

  return NextResponse.json({
    totalPlayers,
    totalRevenue: totalRevenue._sum.amount ?? 0,
    totalActiveLeads: totalLeads,
    totalMeetingsThisWeek: totalMeetings,
    stations: stationRows,
  });
}
