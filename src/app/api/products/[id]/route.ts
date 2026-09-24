import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // This handler had no auth check at all — not even a session — so any
  // anonymous request could read any product by id, including drafts and
  // archived stock that the listing route filters out. The public showcase
  // site has its own /api/public/products/[slug]; nothing in the portal
  // fetches a product by id, so this is a back-office read.
  const denied = await requirePermissionResponse(PERMISSIONS.STORE_VIEW);
  if (denied) return denied;
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, include: { category: true } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rewrites price and stock.
  const denied = await requirePermissionResponse(PERMISSIONS.STORE_EDIT);
  if (denied) return denied;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const product = await db.product.update({
      where: { id },
      data: {
        name: body.name,
        nameFr: body.nameFr ?? null,
        nameAr: body.nameAr ?? null,
        description: body.description ?? null,
        descriptionFr: body.descriptionFr ?? null,
        descriptionAr: body.descriptionAr ?? null,
        images: body.images !== undefined ? JSON.stringify(body.images) : undefined,
        price: body.price !== undefined ? parseFloat(body.price) : undefined,
        discountPrice: body.discountPrice !== undefined ? (body.discountPrice ? parseFloat(body.discountPrice) : null) : undefined,
        stock: body.stock !== undefined ? parseInt(body.stock) : undefined,
        sku: body.sku || null,
        categoryId: body.categoryId || null,
        status: body.status,
        isFeatured: body.isFeatured,
        weight: body.weight !== undefined ? (body.weight ? parseFloat(body.weight) : null) : undefined,
      },
      include: { category: true },
    });
    return NextResponse.json(product);
  } catch { return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.STORE_DELETE);
  if (denied) return denied;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await db.product.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }); }
}
