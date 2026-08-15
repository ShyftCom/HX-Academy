import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activatePayment } from "@/lib/payment-activation";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

/**
 * Manual approval of an offline payment (bank transfer receipt, cash, etc.).
 *
 * The activation itself — approve the payment, start or extend the
 * subscription, notify the player, fire the purchase pixel — lives in
 * src/lib/payment-activation.ts, shared with the SlickPay callbacks so an
 * online payment produces exactly the same result as an approved receipt.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Until now this route gated on auth() alone: *any* signed-in user, players
  // included, could approve *any* payment by id. That was survivable only
  // because a player had no way to create an approvable payment. The SlickPay
  // checkout removes that accident — it mints a pending payment and hands the
  // caller its id — so the same request sequence would buy a free
  // subscription: checkout, never visit SATIM, approve yourself.
  const denied = await requirePermissionResponse(PERMISSIONS.PAYMENTS_APPROVE);
  if (denied) return denied;

  const session = await auth();
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));

    // Gateway payments are settled by SlickPay, never by hand. Allowing a
    // manual override here would reintroduce, for staff, exactly the bypass
    // the permission check above closes for players: an unpaid card checkout
    // approved without a single dinar having moved. Reconciliation goes
    // through /api/payments/slickpay/[id]/verify, which asks the gateway.
    const existing = await db.payment.findUnique({
      where: { id },
      select: { provider: true },
    });
    if (!existing) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (existing.provider === "slickpay") {
      return NextResponse.json(
        { error: "Card payments are confirmed by SlickPay. Use \"Re-check\" to verify this payment." },
        { status: 400 },
      );
    }

    const result = await activatePayment({
      paymentId: id,
      source: "admin",
      actorUserId: session?.user?.id ?? null,
      adminNotes: body.adminNotes ?? null,
    });

    if (result.alreadyActive) {
      return NextResponse.json({ error: "Payment already approved" }, { status: 400 });
    }

    return NextResponse.json({ message: "Payment approved and subscription activated" });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
