import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stationId = req.nextUrl.searchParams.get("stationId") ?? "";

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const sf = stationId ? { stationId } : {};
  const psf = stationId ? { player: { stationId } } : {};

  const [
    totalPlayers,
    activePlayers,
    activeSubscriptions,
    pendingPayments,
    totalRevenue,
    monthRevenue,
    lastMonthRevenue,
    newLeads,
    pendingOrders,
    recentActivity,
    expiringSubscriptions,
  ] = await Promise.all([
    db.player.count({ where: sf }),
    db.player.count({ where: { status: "active", ...sf } }),
    db.subscription.count({ where: { status: "active", ...psf } }),
    db.payment.count({ where: { status: "pending", ...psf } }),
    db.payment.aggregate({ where: { status: "approved", ...psf }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: "approved", approvalDate: { gte: startOfMonth }, ...psf }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: "approved", approvalDate: { gte: startOfLastMonth, lt: startOfMonth }, ...psf }, _sum: { amount: true } }),
    db.lead.count({ where: { createdAt: { gte: startOfMonth }, isConverted: false, ...sf } }),
    db.order.count({ where: { status: { name: "New" } } }).catch(() => 0),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true } } } }),
    db.subscription.count({ where: { status: "active", endDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, ...psf } }),
  ]);

  const thisMonthRev = monthRevenue._sum.amount ?? 0;
  const lastMonthRev = lastMonthRevenue._sum.amount ?? 0;
  const revGrowth = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : 0;

  return NextResponse.json({
    totalPlayers,
    activePlayers,
    activeSubscriptions,
    pendingPayments,
    totalRevenue: totalRevenue._sum.amount ?? 0,
    monthRevenue: thisMonthRev,
    revenueGrowth: revGrowth,
    newLeads,
    pendingOrders,
    recentActivity,
    expiringSubscriptions,
  });
}
