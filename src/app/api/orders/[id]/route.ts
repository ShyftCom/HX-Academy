import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity, createNotification } from "@/lib/activity";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, status: true, player: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const order = await db.order.update({
      where: { id },
      data: { statusId: body.statusId, notes: body.notes },
      include: { items: { include: { product: true } }, status: true, player: true },
    });

    if (order.player && order.player.userId) {
      await createNotification({
        userId: order.player.userId,
        playerId: order.playerId ?? undefined,
        title: "Order Updated",
        message: `Your order #${order.orderNumber} status changed to ${order.status?.name}`,
        type: "info",
        link: "/player/orders",
      });
    }

    await logActivity({ userId: session.user.id, action: "update", module: "orders", description: `Updated order #${order.orderNumber} status` });
    return NextResponse.json(order);
  } catch { return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await db.order.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }); }
}
