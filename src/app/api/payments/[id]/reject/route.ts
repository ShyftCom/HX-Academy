import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity, createNotification } from "@/lib/activity";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Same gap the approve route had: auth() alone let any signed-in user reject
  // any payment by id, including another player's — an IDOR that could cancel
  // a legitimate subscription request out from under its owner.
  const denied = await requirePermissionResponse(PERMISSIONS.PAYMENTS_REJECT);
  if (denied) return denied;

  const session = await auth();
  const { id } = await params;

  try {
    const body = await req.json();
    const payment = await db.payment.findUnique({
      where: { id },
      include: { player: true },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    await db.payment.update({
      where: { id },
      data: {
        status: "rejected",
        adminNotes: body.reason ?? "Payment rejected by admin",
        rejectionReason: body.reason ?? null,
      },
    });

    await createNotification({
      userId: payment.player.userId,
      playerId: payment.playerId,
      title: "Payment Rejected",
      message: body.reason ? `Your payment was rejected: ${body.reason}` : "Your payment has been rejected. Please contact support.",
      type: "error",
      link: "/player/subscriptions",
    });

    await logActivity({
      userId: session?.user?.id ?? null,
      action: "reject",
      module: "payments",
      description: `Rejected payment for ${payment.player.fullName} - Reason: ${body.reason ?? "No reason given"}`,
    });

    return NextResponse.json({ message: "Payment rejected" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Rejection failed" }, { status: 500 });
  }
}
