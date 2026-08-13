/**
 * Where SlickPay sends the player once SATIM is done.
 *
 * This is a browser navigation, not an API call, so it always ends in a
 * redirect back into the player portal with a status the UI can toast.
 *
 * Being a plain GET that anyone could hit, it proves nothing on its own — it
 * only triggers a server-side re-read of the invoice. Hitting this URL by hand
 * for someone else's payment id activates nothing unless SlickPay itself says
 * that invoice is paid.
 */
import { NextRequest, NextResponse } from "next/server";
import { settleSlickPayPayment } from "@/lib/slickpay-settle";
import { appUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const paymentId = new URL(req.url).searchParams.get("payment");
  const destination = new URL("/player/subscriptions", appUrl());

  if (!paymentId) {
    destination.searchParams.set("payment", "error");
    return NextResponse.redirect(destination);
  }

  const outcome = await settleSlickPayPayment(paymentId, "slickpay-return");

  // "pending" is normal here: SATIM occasionally reports the invoice a beat
  // after redirecting. The webhook will settle it, and the portal shows the
  // payment as pending in the meantime.
  const status =
    outcome.result === "paid"
      ? "success"
      : outcome.result === "failed"
        ? "failed"
        : outcome.result === "pending"
          ? "pending"
          : "error";

  destination.searchParams.set("payment", status);
  return NextResponse.redirect(destination);
}
