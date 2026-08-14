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

/**
 * How long a payment is given before a "not found" from SlickPay is read as
 * abandonment. Comfortably longer than a SATIM checkout session, so a player
 * still entering their card details is never declared failed underneath them.
 */
const ABANDON_GRACE_MS = 30 * 60 * 1000;

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
    // A 404 is not a transport failure — it is an answer.
    //
    // SlickPay's detail endpoint resolves the SATIM transaction behind the
    // invoice. A live invoice returns 200 whether or not it has been paid
    // yet, but one that was abandoned or cancelled loses its transaction and
    // starts answering 404 "Transaction introuvable" (confirmed against the
    // sandbox: every "Annulé" and "En attente" invoice 404s, while "Initié"
    // and "Accomplie" ones resolve at any age).
    //
    // Treating that as an error left the payment pending forever and made the
    // webhook reply 503, so SlickPay retried a call that could never succeed.
    // The id came from SlickPay itself, so "not found" means "not paid".
    if (error instanceof SlickPayError && error.status === 404) {
      const ageMs = Date.now() - payment.createdAt.getTime();
      if (ageMs < ABANDON_GRACE_MS) {
        // Too soon to call it. Guards against declaring a checkout dead while
        // the player is still on SATIM's page and some transient lookup blip
        // answers 404.
        return { result: "pending", paymentId, paymentStatus: "not_found_yet" };
      }
      const reason = "The payment was not completed (the SlickPay invoice expired or was cancelled)";
      await markPaymentFailed({ paymentId, reason, providerStatus: "not_found" });
      return { result: "failed", paymentId, reason };
    }

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
    // Integrity check, not a gate. The invoice was created by us for this
    // payment, so a mismatch means something is wrong with the mapping or the
    // plan price changed mid-checkout — worth an operator's attention, but the
    // player has been charged either way and must get what they paid for.
    if (invoice.amount !== null && Math.abs(invoice.amount - payment.amount) > 1) {
      console.warn(
        `SlickPay amount mismatch on payment ${paymentId}: invoice ${invoice.amount} vs expected ${payment.amount}`,
      );
    }

    const activation = await activatePayment({
      paymentId,
      source,
      actorUserId: opts.actorUserId ?? null,
      providerStatus: invoice.status,
      providerPayload: invoice.raw,
    });
    return { result: "paid", alreadyActive: activation.alreadyActive, paymentId };
  }

  // Record what the gateway said, but keep the payment open: an invoice reads
  // unpaid both while the player is still typing their card details and after
  // they abandoned the page, and we cannot tell those apart.
  await db.payment.update({
    where: { id: paymentId },
    data: {
      providerStatus: invoice.status,
      providerPayload: JSON.stringify(invoice.raw),
    },
  });

  // Only an explicitly cancelled invoice is a terminal failure. Note this is
  // *not* keyed off `completed`: SlickPay sets completed to 1 only on paid
  // invoices, so "completed but unpaid" never occurs and would have closed
  // nothing. See the status table in src/lib/slickpay.ts.
  if (invoice.cancelled) {
    const reason = `SlickPay reported the payment as "${invoice.status}"`;
    await markPaymentFailed({
      paymentId,
      reason,
      providerStatus: invoice.status,
      providerPayload: invoice.raw,
    });
    return { result: "failed", paymentId, reason };
  }

  return { result: "pending", paymentId, paymentStatus: invoice.status };
}
