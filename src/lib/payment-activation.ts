/**
 * Turning a paid Payment into an active Subscription.
 *
 * This used to live inline in POST /api/payments/[id]/approve, which was fine
 * while an admin clicking "Approve" was the only way a subscription could
 * start. The SlickPay gateway adds two more callers that can fire *at the same
 * time* for the same payment — the player's return redirect and SlickPay's
 * webhook — so the logic moved here and became idempotent.
 *
 * Idempotency is enforced by a conditional update: the row is only moved out
 * of its current status by a writer that still sees it as not-yet-approved.
 * Whichever of the two callbacks loses that race gets `alreadyActive` and
 * makes no further writes, so the player is never notified twice and never
 * gets two overlapping subscriptions.
 */
import { addMonths, addYears } from "date-fns";
import { db } from "@/lib/db";
import { logActivity, createNotification } from "@/lib/activity";

export type ActivationSource = "admin" | "slickpay-webhook" | "slickpay-return" | "slickpay-manual";

export interface ActivationResult {
  /** False when another writer had already approved this payment. */
  activated: boolean;
  alreadyActive: boolean;
  subscriptionId: string | null;
}

function computeEndDate(startDate: Date, duration?: number, durationType?: string): Date {
  if (!duration || duration <= 0) return addMonths(startDate, 1);
  return durationType === "year"
    ? addYears(startDate, duration)
    : addMonths(startDate, duration);
}

/**
 * Mark a payment approved and start (or extend) the player's subscription.
 *
 * Safe to call more than once for the same payment id; only the first call
 * does any work.
 */
export async function activatePayment({
  paymentId,
  source,
  actorUserId = null,
  adminNotes = null,
  providerStatus,
  providerPayload,
}: {
  paymentId: string;
  source: ActivationSource;
  actorUserId?: string | null;
  adminNotes?: string | null;
  providerStatus?: string;
  providerPayload?: unknown;
}): Promise<ActivationResult> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { player: true, plan: true, subscription: true },
  });
  if (!payment) throw new Error(`Payment ${paymentId} not found`);

  const now = new Date();
  const duration = payment.plan?.duration;
  const durationType = payment.plan?.durationType;

  // A brand-new subscription runs from today.
  const startDate = now;
  const endDate = computeEndDate(startDate, duration, durationType);

  // A renewal adds to what is left instead of replacing it.
  //
  // Both this path and the manual approval it grew out of computed the new
  // period from `now`, so renewing a subscription with twelve days still on it
  // moved its end date to today plus one month and those twelve days were
  // simply gone — the player paid for a month and received a month minus what
  // they had already bought. Renewing early was penalised, which is precisely
  // backwards.
  //
  // An unbroken membership also keeps its original start date: it is the same
  // membership continuing, not a new one. A lapsed one starts again today,
  // since there is no remaining time to add to.
  const currentEnd = payment.subscription?.endDate ?? null;
  const unbroken = currentEnd !== null && currentEnd > now;
  const renewalStart = unbroken ? (payment.subscription?.startDate ?? now) : now;
  const renewalEnd = computeEndDate(unbroken ? currentEnd : now, duration, durationType);

  // Claim and activate in one transaction.
  //
  // The claim below is what makes this idempotent, but on its own it also made
  // failure unrecoverable: it committed immediately, so a crash before the
  // subscription write left a payment marked approved with nothing activated —
  // and because the claim only matches rows that are *not* approved, no retry,
  // webhook redelivery or admin re-check could ever repair it. The player had
  // paid, the row said approved, and they had no subscription.
  //
  // Wrapping both means either the payment is approved *and* the subscription
  // exists, or neither happened and the next delivery tries again.
  const outcome = await db.$transaction(async (tx) => {
    // `status: { not: "approved" }` is the guard: two concurrent callers both
    // read "pending" above, but only one UPDATE matches.
    const claim = await tx.payment.updateMany({
      where: { id: paymentId, status: { not: "approved" } },
      data: {
        status: "approved",
        approvalDate: now,
        paidAt: payment.paidAt ?? now,
        ...(adminNotes !== null ? { adminNotes } : {}),
        ...(providerStatus !== undefined ? { providerStatus } : {}),
        ...(providerPayload !== undefined
          ? { providerPayload: JSON.stringify(providerPayload) }
          : {}),
        // A payment that goes through can no longer be a rejected one.
        rejectionReason: null,
      },
    });

    // `claimed` is reported separately from `subscriptionId`, because a
    // successful claim can legitimately produce no subscription (a payment
    // filed against no plan at all). Collapsing both into a null return would
    // make that indistinguishable from losing the race, and would report a
    // fresh activation as "already active".
    if (claim.count === 0) return { claimed: false, subscriptionId: null };

    if (payment.subscriptionId) {
      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: "active", startDate: renewalStart, endDate: renewalEnd },
      });
      return { claimed: true, subscriptionId: payment.subscriptionId };
    }

    if (payment.planId) {
      const created = await tx.subscription.create({
        data: {
          playerId: payment.playerId,
          planId: payment.planId,
          startDate,
          endDate,
          status: "active",
        },
      });
      // Point the payment at the subscription it paid for, so the admin table
      // and the player's history can link the two.
      await tx.payment.update({
        where: { id: paymentId },
        data: { subscriptionId: created.id },
      });
      return { claimed: true, subscriptionId: created.id };
    }

    return { claimed: true, subscriptionId: null };
  });

  if (!outcome.claimed) {
    return {
      activated: false,
      alreadyActive: true,
      subscriptionId: payment.subscriptionId ?? null,
    };
  }

  const subscriptionId = outcome.subscriptionId;

  // Everything below is best-effort follow-up and deliberately outside the
  // transaction: a failed notification must not roll back a real payment.

  // ---- Player notification ----
  await createNotification({
    userId: payment.player.userId,
    playerId: payment.playerId,
    title: "Payment Approved",
    message: `Your payment of ${payment.amount} DA has been approved. Your subscription is now active.`,
    type: "success",
    link: "/player/subscriptions",
  });

  await logActivity({
    userId: actorUserId,
    action: "approve",
    module: "payments",
    description:
      source === "admin"
        ? `Approved payment for ${payment.player.fullName} - ${payment.amount} DA`
        : `SlickPay payment confirmed for ${payment.player.fullName} - ${payment.amount} DA (${source})`,
    metadata: { paymentId, source, providerRef: payment.providerRef ?? undefined },
  });

  // ---- Marketing pixels ----
  // Fire-and-forget, exactly as the manual approval path already did.
  if (payment.stationId) {
    const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (appUrl) {
      fetch(`${appUrl}/api/pixels/event`, {
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
          eventData: { value: payment.amount, currency: "DZD" },
        }),
      }).catch(() => {});
    }
  }

  return { activated: true, alreadyActive: false, subscriptionId };
}

/**
 * Record a definitive gateway failure against a payment.
 *
 * Only ever called for gateway payments, and never for one that already went
 * through — a late "unpaid" read must not undo a confirmed subscription.
 */
export async function markPaymentFailed({
  paymentId,
  reason,
  providerStatus,
  providerPayload,
}: {
  paymentId: string;
  reason: string;
  providerStatus?: string;
  providerPayload?: unknown;
}): Promise<void> {
  await db.payment.updateMany({
    where: { id: paymentId, status: { notIn: ["approved", "rejected"] } },
    data: {
      status: "rejected",
      rejectionReason: reason,
      ...(providerStatus !== undefined ? { providerStatus } : {}),
      ...(providerPayload !== undefined
        ? { providerPayload: JSON.stringify(providerPayload) }
        : {}),
    },
  });
}
