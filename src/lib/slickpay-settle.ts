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
  sanitizeProviderPayload,
  SlickPayError,
  type SlickPayConfig,
} from "@/lib/slickpay";
import {
  activatePayment,
  markPaymentFailed,
  type ActivationSource,
} from "@/lib/payment-activation";
import { createNotification } from "@/lib/activity";

/**
 * How long a payment is given before a "not found" from SlickPay is read as
 * abandonment. Comfortably longer than a SATIM checkout session, so a player
 * still entering their card details is never declared failed underneath them.
 */
const ABANDON_GRACE_MS = 30 * 60 * 1000;

/**
 * How far the invoice total may drift from the payment before settlement
 * refuses to act on it. One dinar absorbs rounding; anything larger is a real
 * discrepancy, not a formatting artefact.
 */
const AMOUNT_TOLERANCE_DZD = 1;

export type SettleOutcome =
  | { result: "paid"; alreadyActive: boolean; paymentId: string }
  | { result: "pending"; paymentId: string; paymentStatus: string }
  | { result: "failed"; paymentId: string; reason: string }
  /** Gateway says paid, but not for the amount we expected. Needs a human. */
  | { result: "mismatch"; paymentId: string; reason: string }
  | { result: "error"; paymentId: string | null; reason: string };

/**
 * Tell the back office something needs a person.
 *
 * Settlement is retried by the webhook, the return redirect and every admin
 * re-check, so this must not fire on every pass or the dashboard fills with
 * copies of one alert. The guard deliberately does not live here: it used to,
 * as a read of `providerStatus` taken before this pass wrote its flag, and two
 * concurrent settles both read the old value and both alerted. Each caller now
 * gates on an atomic claim instead — the writer that moves the row into
 * "amount_mismatch", or the one that wins activatePayment()'s race.
 */
async function notifyAdmins(title: string, message: string): Promise<void> {
  const admins = await db.user.findMany({
    where: { role: { name: { in: ["Admin", "Super Admin"] } } },
    select: { id: true },
  });
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      title,
      message,
      type: "warning",
      link: "/dashboard/payments",
    });
  }
}

/**
 * Park a paid payment in front of an admin instead of activating it.
 *
 * Deliberately not a failure: the card was charged, so the row stays pending
 * rather than rejected, and `providerStatus` carries the flag that lets the
 * approve route accept a human decision on it — that route refuses to touch a
 * gateway payment in any other state.
 */
async function holdForReview(
  payment: { id: string },
  reason: string,
  raw: unknown,
): Promise<SettleOutcome> {
  // The audit payload is refreshed on every pass: it is meant to be the last
  // thing the gateway said, and a re-check should record the current reading.
  await db.payment.update({
    where: { id: payment.id },
    data: { providerPayload: JSON.stringify(sanitizeProviderPayload(raw)) },
  });

  // The flag and the generated note are claimed exactly once, by the writer
  // that first moves this payment into "amount_mismatch". That buys two
  // things: concurrent settles cannot both alert, and a later re-check cannot
  // overwrite a note the admin has written in the meantime — this branch reran
  // on every re-check and put its own text back each time.
  //
  // The explicit null arm is not redundant. `providerStatus` is nullable, and
  // a bare `not` compiles to SQL where NULL <> 'x' is NULL rather than true,
  // so a row that never got a status could be skipped by the claim and never
  // alert at all. Spelling both arms out does not depend on which way the
  // query builder resolves that.
  const claimed = await db.payment.updateMany({
    where: {
      id: payment.id,
      OR: [{ providerStatus: null }, { providerStatus: { not: "amount_mismatch" } }],
    },
    data: { providerStatus: "amount_mismatch", adminNotes: reason },
  });

  if (claimed.count > 0) {
    console.error(`SlickPay settlement held on payment ${payment.id}: ${reason}`);
    await notifyAdmins("Payment needs review", reason);
  }

  return { result: "mismatch", paymentId: payment.id, reason };
}

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

  const stored = opts.config ?? (await getSlickPayConfig());
  if (!stored.publicKey) {
    return { result: "error", paymentId, reason: "SlickPay is not configured" };
  }

  // Read the invoice back from the environment that issued it, not from
  // whatever the settings say now. Sandbox and production have independent
  // invoice namespaces, so an admin flipping the mode while a checkout was in
  // flight would otherwise look up a live id on the wrong host, get a 404, and
  // have settlement record that as a definitive "not paid" on a card that had
  // genuinely been charged. Rows created before providerMode existed fall back
  // to the current mode, which is the old behaviour.
  const config: SlickPayConfig =
    payment.providerMode === "sandbox" || payment.providerMode === "production"
      ? { ...stored, mode: payment.providerMode }
      : stored;

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
    // The invoice was created by us, for this payment, at this price — so the
    // totals agreeing is not a nicety, it is the check that the id we are
    // holding really is the invoice we issued. A warning was not enough: a
    // mismatch means either the mapping is wrong (we are about to grant a
    // subscription off someone else's payment) or the amount charged is not
    // the amount owed. Neither should activate on its own.
    //
    // An unreadable total is not a passing check. parseAmount() returns null
    // whenever the amount is missing, non-numeric, or has moved in the
    // response — and these payloads are unstable enough that createInvoice()
    // already has to accept two different shapes of them (see slickpay.ts).
    // Collapsing null to a shortfall of 0 meant the one branch that exists to
    // verify the amount waved through every invoice whose amount it could not
    // read, activating on the strength of the `paid` flag alone. Hold instead;
    // an admin can still approve it, having actually looked at the invoice.
    if (invoice.amount === null) {
      return holdForReview(
        payment,
        `SlickPay reports this invoice as paid but returned no readable amount, ` +
          `so the ${payment.amount} DA owed could not be confirmed. Activation ` +
          `is on hold pending review.`,
        invoice.raw,
      );
    }

    const shortfall = payment.amount - invoice.amount;

    if (shortfall > AMOUNT_TOLERANCE_DZD) {
      // Underpaid. Holding is the only safe move: granting a full plan for
      // part of its price is a real loss, and the difference has to be chased
      // or refunded by a person either way.
      return holdForReview(
        payment,
        `SlickPay reports this invoice as paid for ${invoice.amount} DA, but ` +
          `${payment.amount} DA was owed. Activation is on hold pending review.`,
        invoice.raw,
      );
    }

    // Overpaid — most likely the plan got cheaper between checkout and
    // settlement. The player has covered what they owe, so withholding the
    // subscription would punish them for our own timing. Activate, and put the
    // difference in front of an admin to refund.
    const overpayment =
      shortfall < -AMOUNT_TOLERANCE_DZD
        ? `SlickPay reports this invoice as paid for ${invoice.amount} DA, which is ` +
          `more than the ${payment.amount} DA owed. The subscription was activated; ` +
          `the difference may need refunding.`
        : null;

    const activation = await activatePayment({
      paymentId,
      source,
      actorUserId: opts.actorUserId ?? null,
      providerStatus: invoice.status,
      providerPayload: sanitizeProviderPayload(invoice.raw),
    });

    // Alerted after activation, and only on the pass that did it: that claim
    // is the atomic one, so the webhook and the return redirect landing
    // together raise one refund alert between them rather than one each.
    if (overpayment && activation.activated) {
      console.warn(`SlickPay overpayment on payment ${paymentId}: ${overpayment}`);
      await notifyAdmins("Payment overpaid", overpayment);
    }

    return { result: "paid", alreadyActive: activation.alreadyActive, paymentId };
  }

  // Record what the gateway said, but keep the payment open: an invoice reads
  // unpaid both while the player is still typing their card details and after
  // they abandoned the page, and we cannot tell those apart.
  await db.payment.update({
    where: { id: paymentId },
    data: {
      providerStatus: invoice.status,
      providerPayload: JSON.stringify(sanitizeProviderPayload(invoice.raw)),
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
      providerPayload: sanitizeProviderPayload(invoice.raw),
    });
    return { result: "failed", paymentId, reason };
  }

  return { result: "pending", paymentId, paymentStatus: invoice.status };
}
