import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "12");
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const inStock = searchParams.get("inStock") === "true";
  const sort = searchParams.get("sort") ?? "newest";

  const where: Record<string, unknown> = { status: "active" };
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (categoryId) where.categoryId = categoryId;
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
      ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
    };
  }
  if (inStock) where.stock = { gt: 0 };

  const orderBy =
    sort === "price_asc"  ? { price: "asc" as const }
    : sort === "price_desc" ? { price: "desc" as const }
    : { createdAt: "desc" as const };

  const [data, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        variants: {
          where: { isActive: true },
          include: { variantAttributes: { include: { attribute: { include: { group: true } } } } },
        },
      },
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.product.count({ where }),
  ]);

  const categories = await db.productCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage), categories });
}
