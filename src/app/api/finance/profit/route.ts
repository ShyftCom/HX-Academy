import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import { parseDayRange } from "@/lib/date-range";
import { SALARY_CATEGORY_NAME } from "@/lib/charge-fields";

export async function GET(req: Request) {
  // Revenue and profit: Super Admin only unless a role is explicitly given
  // finance:overview. finance:view (charges) is deliberately not enough.
  const denied = await requirePermissionResponse(PERMISSIONS.FINANCE_OVERVIEW);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  // Both bounds optional: none at all is "all time". `to` covers its whole
  // day, so charges and payments timestamped today are counted.
  const dates = parseDayRange(dateFrom, dateTo);
  if ("error" in dates) return NextResponse.json({ error: dates.error, code: "invalid_date" }, { status: 400 });
  const chargeWhere = { ...(dates.range.gte || dates.range.lte ? { chargeDate: dates.range } : {}), ...(stationId ? { stationId } : {}) };
  const paymentWhere = { status: "approved", ...(dates.range.gte || dates.range.lte ? { approvalDate: dates.range } : {}), ...(stationId ? { stationId } : {}) };

  const [revenueAgg, chargesAgg, salaryAgg, chargesWithCat] = await Promise.all([
    db.payment.aggregate({ where: paymentWhere, _sum: { amount: true } }),
    db.charge.aggregate({ where: chargeWhere, _sum: { amount: true } }),
    db.charge.aggregate({ where: { ...chargeWhere, isSalary: true }, _sum: { amount: true } }),
    db.charge.findMany({ where: chargeWhere, include: { category: true } }),
  ]);

  const grossRevenue = revenueAgg._sum.amount ?? 0;
  const totalCharges = Number(chargesAgg._sum.amount ?? 0);
  const salaryCharges = Number(salaryAgg._sum.amount ?? 0);
  const grossProfit = grossRevenue - totalCharges;

  // By category, from the same rows as totalCharges, so the slices always sum
  // to the total. Salaries live in charges only (paying a payroll writes one
  // charge; payroll itself is never added here), so nothing is counted twice.
  // A salary charge recorded without a category used to land in an anonymous
  // "Uncategorized" slice; it belongs with salaries. `name: null` is the
  // uncategorized slice, labelled by the client in the viewer's language.
  const salariesCategory = chargesWithCat.find((c) => c.category?.name === SALARY_CATEGORY_NAME)?.category
    ?? (await db.chargeCategory.findFirst({ where: { name: SALARY_CATEGORY_NAME, isGlobal: true } }));
  const catMap: Record<string, { name: string | null; color: string; amount: number }> = {};
  for (const c of chargesWithCat) {
    const category = c.category ?? (c.isSalary ? salariesCategory : null);
    const key = category?.id ?? "__none__";
    if (!catMap[key]) catMap[key] = { name: category?.name ?? (c.isSalary ? SALARY_CATEGORY_NAME : null), color: category?.color ?? "#6B7280", amount: 0 };
    catMap[key].amount += Number(c.amount);
  }

  // Daily trend: group charges and revenue by day
  const dayMap: Record<string, { date: string; revenue: number; charges: number; profit: number }> = {};
  const approvedPayments = await db.payment.findMany({
    where: paymentWhere,
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
