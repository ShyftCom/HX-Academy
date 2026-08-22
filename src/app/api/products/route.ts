import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { hasPermission, requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  // Deliberately session-only, NOT gated on store:view. The player store lists
  // the catalogue through this route and players hold no store:* permission,
  // so gating it would empty the shop. Nothing here is confidential — the
  // Product model carries no cost or margin, only what a buyer is shown.
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Whether the caller is shopping or running the shop decides what they may
  // see. The portal asks for `public=true`, but that was the client's choice
  // to make: dropping it returned drafts and archived products to anyone.
  const isStoreStaff = await hasPermission(session.user.id, PERMISSIONS.STORE_VIEW);

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
  // A shopper sees the shop, not the stockroom: active products only, whatever
  // the request asked for.
  if (!isStoreStaff) where.status = "active";

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
  const denied = await requirePermissionResponse(PERMISSIONS.STORE_CREATE);
  if (denied) return denied;

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
