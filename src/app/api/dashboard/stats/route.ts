import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holds, requireBackOfficeResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const { denied, permissions } = await requireBackOfficeResponse();
  if (denied) return denied;
  // Every staff member sees the dashboard; revenue and the activity feed are
  // only returned to those who may see them elsewhere.
  const seesRevenue = holds(permissions, PERMISSIONS.FINANCE_OVERVIEW);
  const seesActivity = holds(permissions, PERMISSIONS.ACTIVITY_LOGS_VIEW);

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
    seesRevenue ? db.payment.aggregate({ where: { status: "approved", ...psf }, _sum: { amount: true } }) : null,
    seesRevenue ? db.payment.aggregate({ where: { status: "approved", approvalDate: { gte: startOfMonth }, ...psf }, _sum: { amount: true } }) : null,
    seesRevenue ? db.payment.aggregate({ where: { status: "approved", approvalDate: { gte: startOfLastMonth, lt: startOfMonth }, ...psf }, _sum: { amount: true } }) : null,
    db.lead.count({ where: { createdAt: { gte: startOfMonth }, isConverted: false, ...sf } }),
    db.order.count({ where: { status: { name: "New" } } }).catch(() => 0),
    seesActivity ? db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true } } } }) : [],
    db.subscription.count({ where: { status: "active", endDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, ...psf } }),
  ]);

  const thisMonthRev = monthRevenue?._sum.amount ?? 0;
  const lastMonthRev = lastMonthRevenue?._sum.amount ?? 0;
  const revGrowth = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : 0;

  return NextResponse.json({
    totalPlayers,
    activePlayers,
    activeSubscriptions,
    pendingPayments,
    // Omitted, not zeroed, so a client can tell "hidden" from "nothing earned".
    ...(seesRevenue ? { totalRevenue: totalRevenue?._sum.amount ?? 0, monthRevenue: thisMonthRev, revenueGrowth: revGrowth } : {}),
    newLeads,
    pendingOrders,
    recentActivity,
    expiringSubscriptions,
  });
}
