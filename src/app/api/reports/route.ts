import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subMonths, format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "overview";
  const period = searchParams.get("period") ?? "month";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let dateFilter: { gte: Date; lte?: Date } | undefined;
  const now = new Date();

  if (period === "custom" && startDate && endDate) {
    dateFilter = { gte: new Date(startDate), lte: new Date(endDate) };
  } else if (period === "today") {
    dateFilter = { gte: startOfDay(now) };
  } else if (period === "week") {
    dateFilter = { gte: startOfWeek(now) };
  } else if (period === "month") {
    dateFilter = { gte: startOfMonth(now) };
  } else if (period === "year") {
    dateFilter = { gte: startOfYear(now) };
  }

  if (type === "revenue") {
    // Monthly revenue for the last 12 months
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, 11 - i);
      return { month: format(d, "MMM yyyy"), start: startOfMonth(d), end: i === 11 ? now : startOfMonth(subMonths(now, 10 - i)) };
    });

    const data = await Promise.all(
      months.map(async ({ month, start, end }) => {
        const result = await db.payment.aggregate({
          where: { status: "approved", approvalDate: { gte: start, lt: end } },
          _sum: { amount: true },
        });
        return { month, revenue: result._sum.amount ?? 0 };
      })
    );
    return NextResponse.json({ data });
  }

  if (type === "subscriptions") {
    const data = await db.subscription.groupBy({
      by: ["status"],
      _count: { status: true },
    });
    return NextResponse.json({ data });
  }

  if (type === "leads") {
    const [total, converted, thisMonth] = await Promise.all([
      db.lead.count(),
      db.lead.count({ where: { isConverted: true } }),
      db.lead.count({ where: { createdAt: dateFilter } }),
    ]);
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
    return NextResponse.json({ total, converted, thisMonth, conversionRate });
  }

  if (type === "products") {
    const topProducts = await db.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });
    const productIds = topProducts.map((p: { productId: string }) => p.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds } } });
    const data = topProducts.map((p: { productId: string; _sum: { quantity: number | null; price: number | null } }) => {
      const product = products.find((pr: { id: string; name: string }) => pr.id === p.productId);
      return {
        product: product?.name ?? "Unknown",
        sales: p._sum.quantity ?? 0,
        revenue: (p._sum.price ?? 0) * (p._sum.quantity ?? 0),
      };
    });
    return NextResponse.json({ data });
  }

  // Overview
  const [
    totalRevenue,
    monthRevenue,
    totalPlayers,
    activeSubscriptions,
    totalLeads,
    convertedLeads,
    totalOrders,
    pendingPayments,
  ] = await Promise.all([
    db.payment.aggregate({ where: { status: "approved" }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: "approved", approvalDate: dateFilter }, _sum: { amount: true } }),
    db.player.count(),
    db.subscription.count({ where: { status: "active" } }),
    db.lead.count(),
    db.lead.count({ where: { isConverted: true } }),
    db.order.count(),
    db.payment.count({ where: { status: "pending" } }),
  ]);

  return NextResponse.json({
    totalRevenue: totalRevenue._sum.amount ?? 0,
    periodRevenue: monthRevenue._sum.amount ?? 0,
    totalPlayers,
    activeSubscriptions,
    totalLeads,
    convertedLeads,
    conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
    totalOrders,
    pendingPayments,
  });
}
