import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const status = searchParams.get("status") ?? "";
  const publicOnly = searchParams.get("public") === "true";

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q } }, { sku: { contains: q } }];
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;
  if (publicOnly) where.status = "active";

  const [data, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.product.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.name || body.price === undefined) return NextResponse.json({ error: "Name and price required" }, { status: 400 });

    const product = await db.product.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        images: JSON.stringify(body.images ?? []),
        price: parseFloat(body.price),
        discountPrice: body.discountPrice ? parseFloat(body.discountPrice) : null,
        stock: parseInt(body.stock ?? "0"),
        sku: body.sku || null,
        categoryId: body.categoryId || null,
        status: body.status ?? "active",
        isFeatured: body.isFeatured ?? false,
        weight: body.weight ? parseFloat(body.weight) : null,
      },
      include: { category: true },
    });

    await logActivity({ userId: session.user.id, action: "create", module: "store", description: `Created product: ${product.name}` });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
