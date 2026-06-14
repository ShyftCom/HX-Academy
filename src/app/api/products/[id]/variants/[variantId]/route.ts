import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { variantId } = await params;

  try {
    const body = await req.json();
    const { price, stock, sku, isActive } = body;

    const variant = await db.productVariant.update({
      where: { id: variantId },
      data: {
        ...(price !== undefined && { price: price != null ? price : null }),
        ...(stock !== undefined && { stock }),
        ...(sku !== undefined && { sku: sku ?? null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        variantAttributes: {
          include: { attribute: { include: { group: true } } },
        },
      },
    });

    return NextResponse.json(variant);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { variantId } = await params;

  try {
    await db.productVariant.delete({ where: { id: variantId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
