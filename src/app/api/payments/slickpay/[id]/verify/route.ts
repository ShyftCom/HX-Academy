/**
 * Admin reconciliation: re-check one SlickPay payment against the gateway.
 *
 * Covers the case where a player paid but the webhook never landed (bad URL,
 * deploy in progress, network blip) and they closed the tab before the return
 * redirect fired. Rather than approving by hand and hoping, an admin can make
 * the platform ask SlickPay and settle on the real answer.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import { settleSlickPayPayment } from "@/lib/slickpay-settle";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.PAYMENTS_APPROVE);
  if (denied) return denied;

  const session = await auth();
  const { id } = await params;

  const outcome = await settleSlickPayPayment(id, "slickpay-manual", {
    actorUserId: session?.user?.id ?? null,
  });

  if (outcome.result === "error") {
    return NextResponse.json({ error: outcome.reason }, { status: 502 });
  }

  return NextResponse.json(outcome);
}
