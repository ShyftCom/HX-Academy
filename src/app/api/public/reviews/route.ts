import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("station_id") ?? null;
  const productId = searchParams.get("product_id") ?? null;
  const featured = searchParams.get("featured") === "true";
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const sort = searchParams.get("sort") ?? "newest";

  const where: Record<string, unknown> = { status: "approved" };
  if (stationId) where.stationId = stationId;
  if (productId) where.productId = productId;
  if (featured) where.isFeatured = true;

  const orderBy =
    sort === "highest" ? { rating: "desc" as const }
    : sort === "lowest"  ? { rating: "asc" as const }
    : { createdAt: "desc" as const };

  const [reviews, total, aggregates] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, orderBy],
      take: limit,
      select: {
        id: true,
        reviewerName: true,
        rating: true,
        title: true,
        content: true,
        isVerified: true,
        isFeatured: true,
        adminReply: true,
        adminReplyAt: true,
        createdAt: true,
        product: { select: { name: true } },
      },
    }),
    db.review.count({ where }),
    db.review.aggregate({ where, _avg: { rating: true } }),
  ]);

  const breakdown = await db.review.groupBy({
    by: ["rating"],
    where,
    _count: { rating: true },
  });

  return NextResponse.json({ reviews, total, avgRating: aggregates._avg.rating ?? 0, breakdown });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { reviewerName, reviewerEmail, reviewerPhone, rating, title, content, productId, orderId, stationId } = body;

  if (!reviewerName || !content || !rating) {
    return NextResponse.json({ error: "Name, content, and rating are required" }, { status: 400 });
  }
  if (rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  if (content.length < 20) return NextResponse.json({ error: "Review must be at least 20 characters" }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ error: "Review must be under 1000 characters" }, { status: 400 });

  let isVerified = false;

  if (orderId && (reviewerEmail || reviewerPhone)) {
    const order = await db.websiteOrder.findUnique({ where: { id: orderId } });
    if (order) {
      isVerified =
        (reviewerEmail && order.customerEmail === reviewerEmail) ||
        (reviewerPhone && order.customerPhone === reviewerPhone) ||
        false;
    }
  }

  const review = await db.review.create({
    data: {
      stationId: stationId ?? null,
      reviewerName,
      reviewerEmail: reviewerEmail ?? null,
      reviewerPhone: reviewerPhone ?? null,
      rating: parseInt(rating),
      title: title ?? null,
      content,
      productId: productId ?? null,
      orderId: orderId ?? null,
      status: "pending",
      isVerified,
    },
  });

  // Notify admins
  try {
    const admins = await db.user.findMany({ where: { role: { name: "super_admin" } }, select: { id: true } });
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    await Promise.all(
      admins.map(a =>
        db.notification.create({
          data: {
            userId: a.id,
            title: "New review pending approval",
            message: `${reviewerName} left a ${stars} review — "${title ?? content.slice(0, 40)}"`,
            type: "info",
            link: "/dashboard/website/reviews",
          },
        })
      )
    );
  } catch {}

  // Fire pixels
  try {
    const pixelConfigs = await db.pixelConfig.findMany({
      where: { isActive: true, ...(stationId ? { stationId } : {}) },
    });
    if (pixelConfigs.length > 0) {
      const { fireConversionEvent } = await import("@/lib/pixels");
      await fireConversionEvent(
        "SubmitApplication",
        { firstName: reviewerName, email: reviewerEmail ?? undefined, phone: reviewerPhone ?? undefined },
        { contentName: "review" },
        pixelConfigs as Parameters<typeof fireConversionEvent>[3]
      );
    }
  } catch {}

  return NextResponse.json({ id: review.id, status: "pending" }, { status: 201 });
}
