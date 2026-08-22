/**
 * SlickPay -> platform callback. This is the "call the platform back after the
 * payment to say it was done" half of the flow.
 *
 * Unauthenticated by nature: SlickPay's servers call it, not a signed-in user.
 * Two things keep that safe.
 *
 *  1. The `webhook_signature` we set per-invoice comes back in the payload, and
 *     is compared in constant time against our stored secret. SlickPay
 *     documents the parameter but not the payload shape or a signing scheme,
 *     so this is a shared-secret check, not an HMAC over the body.
 *
 *  2. It is not treated as proof of anything regardless. The body only tells
 *     us *which* payment to look at; settleSlickPayPayment() then asks SlickPay
 *     directly whether that invoice is paid. A forged call with a leaked secret
 *     still cannot activate a subscription that was never paid for.
 *
 * Always answers 200 once the caller is recognised. A non-2xx would make
 * SlickPay retry, and a retry cannot fix a payment that genuinely is not paid.
 */
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSlickPayConfig } from "@/lib/slickpay";
import { settleSlickPayPayment } from "@/lib/slickpay-settle";

export const dynamic = "force-dynamic";

function secretsMatch(received: string, expected: string): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Pull a value out of a payload whose exact shape SlickPay does not document. */
function pick(body: Record<string, unknown>, keys: string[]): string | null {
  const meta = (body.webhook_meta_data ?? body.meta_data ?? body.metadata ?? {}) as Record<
    string,
    unknown
  >;
  const data = (body.data ?? {}) as Record<string, unknown>;
  for (const key of keys) {
    for (const source of [body, meta, data]) {
      const value = source?.[key];
      if (typeof value === "string" && value) return value;
      if (typeof value === "number") return String(value);
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = await getSlickPayConfig();

  // ---- 1. Is this really SlickPay? ----
  const signature =
    pick(body, ["webhook_signature", "signature"]) ??
    req.headers.get("x-webhook-signature") ??
    "";

  if (!config.webhookSecret || !secretsMatch(signature, config.webhookSecret)) {
    console.warn("Rejected SlickPay webhook with bad or missing signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ---- 2. Which payment? ----
  // Prefer our own id from webhook_meta_data; fall back to looking the invoice
  // up by the reference we stored at checkout.
  let paymentId = pick(body, ["paymentId", "payment_id"]);

  if (!paymentId) {
    const invoiceId = pick(body, ["invoice", "invoice_id", "id"]);
    if (invoiceId) {
      const match = await db.payment.findFirst({
        where: { providerRef: invoiceId, provider: "slickpay" },
        select: { id: true },
      });
      paymentId = match?.id ?? null;
    }
  }

  if (!paymentId) {
    console.warn("SlickPay webhook did not identify a known payment", body);
    return NextResponse.json({ received: true, matched: false });
  }

  // ---- 3. Ask SlickPay what actually happened ----
  const outcome = await settleSlickPayPayment(paymentId, "slickpay-webhook", { config });

  if (outcome.result === "error") {
    // The gateway was unreachable. Ask for a retry — this one is worth
    // repeating, unlike an "unpaid" verdict.
    console.error("SlickPay webhook could not verify", paymentId, outcome.reason);
    return NextResponse.json({ received: true, error: outcome.reason }, { status: 503 });
  }

  // A held mismatch answers 200 on purpose. It is a real, final reading of the
  // invoice that needs a person, not a delivery failure — retrying would only
  // re-read the same numbers and re-alert the same admins.
  if (outcome.result === "mismatch") {
    return NextResponse.json({ received: true, result: "mismatch", needsReview: true });
  }

  return NextResponse.json({ received: true, result: outcome.result });
}
