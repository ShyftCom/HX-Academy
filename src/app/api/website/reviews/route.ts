import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const status = searchParams.get("status") ?? "";
  const rating = searchParams.get("rating") ?? "";
  const productId = searchParams.get("productId") ?? "";
  const stationId = searchParams.get("stationId") ?? "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (rating) where.rating = parseInt(rating);
  if (productId) where.productId = productId;
  if (stationId) where.stationId = stationId;

  const [data, total] = await Promise.all([
    db.review.findMany({
      where,
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.review.count({ where }),
  ]);

  const [totalCount, pendingCount, avgResult, thisMonthCount] = await Promise.all([
    db.review.count(),
    db.review.count({ where: { status: "pending" } }),
    db.review.aggregate({ where: { status: "approved" }, _avg: { rating: true } }),
    db.review.count({
      where: {
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    totalPages: Math.ceil(total / perPage),
    stats: {
      total: totalCount,
      pending: pendingCount,
      avgRating: avgResult._avg.rating ?? 0,
      thisMonth: thisMonthCount,
    },
  });
}
