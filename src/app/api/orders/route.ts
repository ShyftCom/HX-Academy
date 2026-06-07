import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateOrderNumber } from "@/lib/utils";
import { logActivity as log, createNotification } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const q = searchParams.get("q") ?? "";
  const statusId = searchParams.get("statusId") ?? "";
  const playerId = searchParams.get("playerId") ?? "";

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ orderNumber: { contains: q } }, { player: { fullName: { contains: q } } }];
  if (statusId) where.statusId = statusId;
  if (playerId) where.playerId = playerId;

  const [data, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        player: true,
        status: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.order.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.items || !body.items.length) {
      return NextResponse.json({ error: "Order must have at least one item" }, { status: 400 });
    }

    const defaultStatus = await db.orderStatus.findFirst({ where: { isDefault: true } });

    const orderItems: Array<{ productId: string; quantity: number; price: number }> = [];
    let totalAmount = 0;

    for (const item of body.items) {
      const product = await db.product.findUnique({ where: { id: item.productId } });
      if (!product) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
      if (product.stock < item.quantity) return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
      const price = product.discountPrice ?? product.price;
      orderItems.push({ productId: item.productId, quantity: item.quantity, price });
      totalAmount += price * item.quantity;
    }

    const order = await db.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        playerId: body.playerId ?? null,
        statusId: body.statusId ?? defaultStatus?.id ?? null,
        totalAmount,
        codData: JSON.stringify(body.codData ?? {}),
        notes: body.notes ?? null,
        items: {
          create: orderItems,
        },
      },
      include: { items: { include: { product: true } }, status: true, player: true },
    });

    // Decrement stock
    for (const item of orderItems) {
      await db.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Notify admins
    const admins = await db.user.findMany({ where: { role: { name: { in: ["Admin", "Super Admin"] } } }, select: { id: true } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "New Order",
        message: `New order #${order.orderNumber} received - ${totalAmount} DA`,
        type: "info",
        link: `/dashboard/orders`,
      });
    }

    await log({ userId: session.user.id, action: "create", module: "orders", description: `Created order #${order.orderNumber}` });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
