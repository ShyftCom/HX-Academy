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
// Settlement calls out to SlickPay; give it more room than the platform
// default so a slow gateway is reported by our own error handling rather than
// killed mid-verification.
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const paymentId = new URL(req.url).searchParams.get("payment");
  const destination = new URL("/player/subscriptions", appUrl());

  if (!paymentId) {
    destination.searchParams.set("payment", "error");
    return NextResponse.redirect(destination);
  }

  // Whatever happens, this has to end in a redirect. The person hitting it has
  // just handed over a card, and an unhandled throw here would answer that
  // with a raw Next.js 500 on an API URL — no way back into the portal, and
  // every reason to assume the money vanished. The payment itself is safe
  // either way: the webhook settles it independently, and nothing about the
  // outcome depends on this request succeeding.
  let status: string;
  try {
    const outcome = await settleSlickPayPayment(paymentId, "slickpay-return");

    // "pending" is normal here: SATIM occasionally reports the invoice a beat
    // after redirecting. The webhook will settle it, and the portal shows the
    // payment as pending in the meantime.
    status =
      outcome.result === "paid"
        ? "success"
        : outcome.result === "failed"
          ? "failed"
          : outcome.result === "pending"
            ? "pending"
            : outcome.result === "mismatch"
              ? "review"
              : "error";
  } catch (error) {
    console.error("SlickPay return handler failed", paymentId, error);
    status = "pending";
  }

  destination.searchParams.set("payment", status);
  return NextResponse.redirect(destination);
}
