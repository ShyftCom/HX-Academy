import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const product = await db.product.findFirst({
    where: { OR: [{ slug }, { id: slug }], status: "active" },
    include: {
      category: { select: { id: true, name: true } },
      variants: {
        where: { isActive: true },
        include: { variantAttributes: { include: { attribute: { include: { group: true } } } } },
      },
    },
  });

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [reviewsData, avgResult] = await Promise.all([
    db.review.findMany({
      where: { productId: product.id, status: "approved" },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true, reviewerName: true, rating: true, title: true, content: true,
        isVerified: true, adminReply: true, createdAt: true,
      },
    }),
    db.review.aggregate({ where: { productId: product.id, status: "approved" }, _avg: { rating: true } }),
  ]);

  return NextResponse.json({ product, reviews: reviewsData, avgRating: avgResult._avg.rating ?? 0 });
}
