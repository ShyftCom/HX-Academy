import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { activatePayment } from "@/lib/payment-activation";

/**
 * Manual approval of an offline payment (bank transfer receipt, cash, etc.).
 *
 * The activation itself — approve the payment, start or extend the
 * subscription, notify the player, fire the purchase pixel — now lives in
 * src/lib/payment-activation.ts, shared with the SlickPay callbacks so an
 * online payment produces exactly the same result as an approved receipt.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));

    const result = await activatePayment({
      paymentId: id,
      source: "admin",
      actorUserId: session.user.id,
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
