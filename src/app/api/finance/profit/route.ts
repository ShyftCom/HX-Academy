import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const now = new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = dateTo ? new Date(dateTo) : now;

  const [revenueAgg, chargesAgg, salaryAgg, chargesWithCat] = await Promise.all([
    db.payment.aggregate({
      where: { status: "approved", approvalDate: { gte: from, lte: to }, ...(stationId ? { stationId } : {}) },
      _sum: { amount: true },
    }),
    db.charge.aggregate({
      where: { chargeDate: { gte: from, lte: to }, ...(stationId ? { stationId } : {}) },
      _sum: { amount: true },
    }),
    db.charge.aggregate({
      where: { isSalary: true, chargeDate: { gte: from, lte: to }, ...(stationId ? { stationId } : {}) },
      _sum: { amount: true },
    }),
    db.charge.findMany({
      where: { chargeDate: { gte: from, lte: to }, ...(stationId ? { stationId } : {}) },
      include: { category: true },
    }),
  ]);

  const grossRevenue = revenueAgg._sum.amount ?? 0;
  const totalCharges = Number(chargesAgg._sum.amount ?? 0);
  const salaryCharges = Number(salaryAgg._sum.amount ?? 0);
  const grossProfit = grossRevenue - totalCharges;

  // Aggregate by category
  const catMap: Record<string, { name: string; color: string; amount: number }> = {};
  for (const c of chargesWithCat) {
    const key = c.category?.name ?? "Uncategorized";
    if (!catMap[key]) catMap[key] = { name: key, color: c.category?.color ?? "#6B7280", amount: 0 };
    catMap[key].amount += Number(c.amount);
  }

  // Daily trend: group charges and revenue by day
  const dayMap: Record<string, { date: string; revenue: number; charges: number; profit: number }> = {};
  const approvedPayments = await db.payment.findMany({
    where: { status: "approved", approvalDate: { gte: from, lte: to }, ...(stationId ? { stationId } : {}) },
    select: { approvalDate: true, amount: true },
  });

  for (const p of approvedPayments) {
    if (!p.approvalDate) continue;
    const day = p.approvalDate.toISOString().split("T")[0];
    if (!dayMap[day]) dayMap[day] = { date: day, revenue: 0, charges: 0, profit: 0 };
    dayMap[day].revenue += p.amount;
  }
  for (const c of chargesWithCat) {
    const day = c.chargeDate.toISOString().split("T")[0];
    if (!dayMap[day]) dayMap[day] = { date: day, revenue: 0, charges: 0, profit: 0 };
    dayMap[day].charges += Number(c.amount);
  }
  const dailyTrend = Object.values(dayMap).map((d) => ({ ...d, profit: d.revenue - d.charges })).sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    grossRevenue,
    totalCharges,
    grossProfit,
    salaryCharges,
    byCategory: Object.values(catMap),
    dailyTrend,
  });
}
