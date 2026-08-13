/**
 * Verify a SlickPay payment against the gateway and settle it locally.
 *
 * Three callers reach this, and all three must reach the same conclusion:
 *   - the player's return redirect  (they came back from SATIM)
 *   - SlickPay's webhook            (server-to-server, may arrive first)
 *   - an admin's "Re-check" button  (reconciliation when both were missed)
 *
 * None of them is trusted as evidence. Each one only says "go look" — the
 * actual decision comes from re-reading the invoice from SlickPay, which is
 * what the docs require ("implement server-side verification on your callback
 * page to check the SlickPay invoice status"). activatePayment() then handles
 * two of these landing at once.
 */
import { db } from "@/lib/db";
import {
  getSlickPayConfig,
  getInvoice,
  SlickPayError,
  type SlickPayConfig,
} from "@/lib/slickpay";
import {
  activatePayment,
  markPaymentFailed,
  type ActivationSource,
} from "@/lib/payment-activation";

export type SettleOutcome =
  | { result: "paid"; alreadyActive: boolean; paymentId: string }
  | { result: "pending"; paymentId: string; paymentStatus: string }
  | { result: "failed"; paymentId: string; reason: string }
  | { result: "error"; paymentId: string | null; reason: string };

export async function settleSlickPayPayment(
  paymentId: string,
  source: ActivationSource,
  opts: { config?: SlickPayConfig; actorUserId?: string | null } = {},
): Promise<SettleOutcome> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });

  if (!payment) return { result: "error", paymentId: null, reason: "Payment not found" };
  if (payment.provider !== "slickpay") {
    return { result: "error", paymentId, reason: "Not a SlickPay payment" };
  }

  // Already settled — say so without another round trip. This is the common
  // case for the return redirect when the webhook got there first.
  if (payment.status === "approved") {
    return { result: "paid", alreadyActive: true, paymentId };
  }
  if (!payment.providerRef) {
    return { result: "error", paymentId, reason: "Payment has no SlickPay invoice reference" };
  }

  const config = opts.config ?? (await getSlickPayConfig());
  if (!config.publicKey) {
    return { result: "error", paymentId, reason: "SlickPay is not configured" };
  }

  let invoice;
  try {
    invoice = await getInvoice(config, payment.providerRef);
  } catch (error) {
    const reason =
      error instanceof SlickPayError
        ? `Could not verify with SlickPay: ${error.message}`
        : "Could not verify with SlickPay";
    console.error("SlickPay verification failed", paymentId, error);
    // Deliberately not marked failed: an unreachable gateway says nothing
    // about whether the card was charged. Leave it pending for the next
    // webhook retry or an admin re-check.
    return { result: "error", paymentId, reason };
  }

  if (invoice.paid) {
    const activation = await activatePayment({
      paymentId,
      source,
      actorUserId: opts.actorUserId ?? null,
      providerStatus: invoice.paymentStatus,
      providerPayload: invoice.raw,
    });
    return { result: "paid", alreadyActive: activation.alreadyActive, paymentId };
  }

  // Record what the gateway said, but keep the payment open: an invoice reads
  // "unpaid" both while the player is still typing their card details and
  // after they abandoned the page, and we cannot tell those apart.
  await db.payment.update({
    where: { id: paymentId },
    data: {
      providerStatus: invoice.paymentStatus,
      providerPayload: JSON.stringify(invoice.raw),
    },
  });

  // `completed` means SlickPay considers the invoice closed. Unpaid *and*
  // closed is a real failure, so stop showing it to the player as in-progress.
  if (invoice.completed) {
    await markPaymentFailed({
      paymentId,
      reason: `SlickPay reported the payment as ${invoice.paymentStatus}`,
      providerStatus: invoice.paymentStatus,
      providerPayload: invoice.raw,
    });
    return {
      result: "failed",
      paymentId,
      reason: `SlickPay reported the payment as ${invoice.paymentStatus}`,
    };
  }

  return { result: "pending", paymentId, paymentStatus: invoice.paymentStatus };
}
