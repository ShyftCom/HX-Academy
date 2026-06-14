import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;

  const variants = await db.productVariant.findMany({
    where: { productId },
    include: {
      variantAttributes: {
        include: {
          attribute: {
            include: { group: true },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(variants);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;

  try {
    const body = await req.json();
    const { variants } = body as {
      variants: Array<{
        sku?: string;
        price?: number | null;
        stock: number;
        imageUrl?: string;
        isActive: boolean;
        attributeIds: string[];
      }>;
    };

    if (!Array.isArray(variants)) {
      return NextResponse.json({ error: "variants array required" }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId } });

      for (const v of variants) {
        await tx.productVariant.create({
          data: {
            productId,
            sku: v.sku ?? null,
            price: v.price != null ? v.price : null,
            stock: v.stock,
            imageUrl: v.imageUrl ?? null,
            isActive: v.isActive,
            variantAttributes: {
              create: v.attributeIds.map((attributeId) => ({ attributeId })),
            },
          },
        });
      }
    });

    const created = await db.productVariant.findMany({
      where: { productId },
      include: {
        variantAttributes: {
          include: { attribute: { include: { group: true } } },
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
