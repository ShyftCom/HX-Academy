import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity, createNotification } from "@/lib/activity";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Any order by id, with the buyer's delivery details attached.
  const denied = await requirePermissionResponse(PERMISSIONS.ORDERS_VIEW);
  if (denied) return denied;

  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, status: true, player: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Moves an order through the fulfilment workflow and notifies the buyer,
  // so on auth() alone any signed-in user could mark a stranger's order
  // delivered — or cancelled.
  const denied = await requirePermissionResponse(PERMISSIONS.ORDERS_EDIT);
  if (denied) return denied;

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
  const denied = await requirePermissionResponse(PERMISSIONS.ORDERS_DELETE);
  if (denied) return denied;

  const { id } = await params;
  try {
    await db.order.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }); }
}
