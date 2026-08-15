import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity, createNotification } from "@/lib/activity";
import { addMonths, addYears } from "date-fns";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // This route gated on auth() alone: any signed-in user, players included,
  // could approve any payment by id — and approving is what creates the active
  // subscription below. Nothing about the caller was checked against the
  // payment they were approving.
  const denied = await requirePermissionResponse(PERMISSIONS.PAYMENTS_APPROVE);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const body = await req.json();
    const payment = await db.payment.findUnique({
      where: { id },
      include: { player: true, plan: true, subscription: true },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.status === "approved") return NextResponse.json({ error: "Payment already approved" }, { status: 400 });

    const startDate = new Date();
    let endDate: Date;

    if (payment.plan) {
      endDate = payment.plan.durationType === "year"
        ? addYears(startDate, payment.plan.duration)
        : addMonths(startDate, payment.plan.duration);
    } else {
      endDate = addMonths(startDate, 1);
    }

    // Approve payment
    await db.payment.update({
      where: { id },
      data: {
        status: "approved",
        approvalDate: new Date(),
        adminNotes: body.adminNotes ?? null,
      },
    });

    // Activate or create subscription
    if (payment.subscriptionId) {
      await db.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: "active", startDate, endDate },
      });
    } else if (payment.planId) {
      await db.subscription.create({
        data: {
          playerId: payment.playerId,
          planId: payment.planId,
          startDate,
          endDate,
          status: "active",
        },
      });
    }

    // Notify player
    await createNotification({
      userId: payment.player.userId,
      playerId: payment.playerId,
      title: "Payment Approved",
      message: `Your payment of ${payment.amount} DA has been approved. Your subscription is now active.`,
      type: "success",
      link: "/player/subscriptions",
    });

    await logActivity({
      userId: session.user.id,
      action: "approve",
      module: "payments",
      description: `Approved payment for ${payment.player.fullName} - ${payment.amount} DA`,
    });

    if (payment.stationId) {
      fetch(`${process.env.NEXTAUTH_URL ?? ""}/api/pixels/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "Purchase",
          stationId: payment.stationId,
          userData: {
            phone: payment.player.phone ?? undefined,
            email: payment.player.email ?? undefined,
            firstName: payment.player.fullName,
          },
          eventData: {
            value: payment.amount,
            currency: "DZD",
          },
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ message: "Payment approved and subscription activated" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
