/**
 * Start a SlickPay checkout for a subscription plan.
 *
 * POST { planId, subscriptionId?, playerId? } -> { url, paymentId }
 *
 * The caller is redirected to `url` (SATIM's hosted card page). Nothing is
 * activated here — the payment row is created as "pending" and only the
 * webhook / return handlers, after re-reading the invoice from SlickPay, can
 * approve it.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { appUrl } from "@/lib/app-url";
import {
  getSlickPayConfig,
  isSlickPayUsable,
  createInvoice,
  SlickPayError,
} from "@/lib/slickpay";

/** SlickPay rejects invoices at or below 100 DZD. */
const MIN_AMOUNT_DZD = 100;

/** SlickPay wants firstname/lastname; the platform stores one `fullName`. */
function splitName(fullName: string): { firstname: string; lastname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: "Player", lastname: "-" };
  if (parts.length === 1) return { firstname: parts[0], lastname: "-" };
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getSlickPayConfig();
  if (!isSlickPayUsable(config)) {
    return NextResponse.json(
      { error: "Online payment is not available right now" },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    if (!body.planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    // ---- Who is paying ----
    // A player may only ever pay for themselves. Staff can start a checkout on
    // someone's behalf, but only with payments:create.
    const sessionPlayerId = (session.user as { playerId?: string | null }).playerId ?? null;
    let playerId = sessionPlayerId;

    if (body.playerId && body.playerId !== sessionPlayerId) {
      const allowed = await hasPermission(session.user.id, PERMISSIONS.PAYMENTS_CREATE);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      playerId = body.playerId;
    }

    if (!playerId) {
      return NextResponse.json(
        { error: "No player account is linked to this user" },
        { status: 400 },
      );
    }

    const player = await db.player.findUnique({ where: { id: playerId } });
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    // ---- What it costs ----
    // Price is read from the plan row. A client-supplied amount is ignored
    // outright: accepting one would let a player charge themselves 100 DA for
    // a 30,000 DA plan and have it auto-activate.
    const plan = await db.subscriptionPlan.findUnique({ where: { id: body.planId } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    if (!plan.isActive) {
      return NextResponse.json({ error: "This plan is no longer available" }, { status: 400 });
    }

    const amount = Math.round(plan.price);
    if (!Number.isFinite(amount) || amount <= MIN_AMOUNT_DZD) {
      return NextResponse.json(
        { error: `Plan price must be above ${MIN_AMOUNT_DZD} DA to be paid online` },
        { status: 400 },
      );
    }

    // If renewing a specific subscription, make sure it belongs to this player.
    let subscriptionId: string | null = null;
    if (body.subscriptionId) {
      const sub = await db.subscription.findUnique({ where: { id: body.subscriptionId } });
      if (!sub || sub.playerId !== playerId) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
      }
      subscriptionId = sub.id;
    }

    // ---- Our record first ----
    // Created before calling SlickPay so its id can be embedded in the return
    // URL and webhook metadata. If the SlickPay call then fails we mark it
    // failed rather than leaving an orphan pending row that an admin might
    // approve by hand.
    const payment = await db.payment.create({
      data: {
        playerId,
        planId: plan.id,
        subscriptionId,
        amount: plan.price,
        status: "pending",
        provider: "slickpay",
        providerStatus: "unpaid",
        stationId: player.stationId ?? null,
      },
    });

    const base = appUrl();
    const { firstname, lastname } = splitName(player.fullName);

    let invoice;
    try {
      invoice = await createInvoice(config, {
        amount,
        returnUrl: `${base}/api/payments/slickpay/return?payment=${payment.id}`,
        webhookUrl: `${base}/api/payments/slickpay/webhook`,
        webhookSecret: config.webhookSecret || undefined,
        webhookMetaData: { paymentId: payment.id },
        firstname,
        lastname,
        phone: player.phone ?? undefined,
        email: player.email ?? undefined,
        address: player.address ?? undefined,
        note: `Subscription: ${plan.name}`,
        items: [{ name: plan.name, price: amount, quantity: 1 }],
      });
    } catch (error) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "failed",
          rejectionReason:
            error instanceof SlickPayError
              ? `SlickPay refused the invoice: ${error.message}`
              : "Could not reach SlickPay",
        },
      });
      throw error;
    }

    await db.payment.update({
      where: { id: payment.id },
      data: {
        providerRef: invoice.id,
        providerUrl: invoice.url,
        providerPayload: JSON.stringify(invoice.raw),
      },
    });

    await logActivity({
      userId: session.user.id,
      action: "create",
      module: "payments",
      description: `SlickPay checkout opened for ${player.fullName} - ${plan.name} (${amount} DA)`,
      metadata: { paymentId: payment.id, invoiceId: invoice.id, mode: config.mode },
    });

    return NextResponse.json({ url: invoice.url, paymentId: payment.id }, { status: 201 });
  } catch (error) {
    if (error instanceof SlickPayError) {
      console.error("SlickPay checkout failed", error.status, error.body);
      return NextResponse.json(
        { error: `Payment provider error: ${error.message}` },
        { status: 502 },
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Could not start the payment" }, { status: 500 });
  }
}
