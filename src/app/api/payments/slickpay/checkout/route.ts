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
import { getSetting } from "@/lib/settings";
import {
  getSlickPayConfig,
  isSlickPayUsable,
  createInvoice,
  sanitizeProviderPayload,
  SlickPayError,
} from "@/lib/slickpay";

/**
 * Vercel would otherwise apply its default function limit, which is shorter
 * than the 20s timeout inside the SlickPay client — so a slow gateway got the
 * invocation killed and showed the player a platform 504 instead of our own
 * handled error. Observed for real: the sandbox intermittently takes over 20s
 * to create an invoice, while normally answering in under two.
 */
export const maxDuration = 30;

/** SlickPay rejects invoices at or below 100 DZD. */
const MIN_AMOUNT_DZD = 100;

/**
 * How long an unpaid checkout stays reusable. Long enough that a double tap or
 * a back-button return lands on the same invoice rather than opening a second
 * one, short enough that a player returning much later gets a fresh SATIM page
 * instead of an expired one.
 */
const CHECKOUT_REUSE_MS = 20 * 60 * 1000;

/**
 * SlickPay wants firstname/lastname; the platform stores one `fullName`.
 *
 * Both parts must be at least 2 characters or the API rejects the invoice with
 * 422 "Le texte firstname doit contenir au moins 2 caractères". The old
 * one-character "-" placeholder for a single-word name tripped exactly that,
 * so a player recorded as "Yacine" could never have checked out. A single-word
 * name repeats into both fields rather than inventing a surname.
 */
function splitName(fullName: string): { firstname: string; lastname: string } | null {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  const firstname = parts[0];
  const lastname = parts.length > 1 ? parts.slice(1).join(" ") : firstname;
  if (firstname.length < 2 || lastname.length < 2) return null;

  return { firstname, lastname };
}

/**
 * Contact details SlickPay insists on, despite documenting them as optional.
 *
 * The Create Invoice page marks phone, email and address "Required: No", and
 * the API returns 422 without them ("Le champ téléphone est obligatoire", and
 * the same for email and adresse). Every one of these is nullable on Player,
 * so this is not a rare case — it is any player whose profile was never
 * completed. Checking here turns an opaque "Payment provider error" 502 into a
 * message that says which field to fill in.
 */
function missingContactFields(player: {
  fullName: string;
  phone: string | null;
  email: string | null;
  user: { email: string };
}): string[] {
  const missing: string[] = [];
  if (!player.phone?.trim()) missing.push("phone number");
  // Email is not listed: contactEmail() below always resolves one, because a
  // Player is always attached to a User and User.email is required. Blocking
  // on Player.email would have been a dead end anyway — the player profile
  // page lets someone edit their phone and address but shows email read-only,
  // so a player with a null Player.email could never have unblocked themselves.
  if (!splitName(player.fullName)) missing.push("full name (first and last)");
  return missing;
}

/** The player's own email if recorded, otherwise their login email. */
function contactEmail(player: { email: string | null; user: { email: string } }): string {
  return player.email?.trim() || player.user.email;
}

/** ["a", "b", "c"] -> "a, b and c" — three missing fields should not read as "a and b and c". */
function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
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

    const player = await db.player.findUnique({
      where: { id: playerId },
      include: { user: { select: { email: true } } },
    });
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    // Fail here, with something the player can act on, rather than letting
    // SlickPay reject the invoice and surfacing a bare 502.
    const missing = missingContactFields(player);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Please add your ${formatList(missing)} to your profile before paying by card.`,
          missingFields: missing,
        },
        { status: 400 },
      );
    }

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

    // If renewing a specific subscription it must belong to this player *and*
    // be for this plan. Ownership alone was not enough: activation extends the
    // named subscription without touching its planId, so paying for the
    // cheapest plan while naming an annual subscription bought a year of the
    // expensive one for the price of a month.
    let subscriptionId: string | null = null;
    if (body.subscriptionId) {
      const sub = await db.subscription.findUnique({ where: { id: body.subscriptionId } });
      if (!sub || sub.playerId !== playerId) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
      }
      if (sub.planId !== plan.id) {
        return NextResponse.json(
          { error: "That subscription is for a different plan" },
          { status: 400 },
        );
      }
      subscriptionId = sub.id;
    }

    // Idempotency. A double-submitted form, an impatient second tap, or a
    // back-button return would otherwise open a second invoice for the same
    // plan — and if the player paid both, they would hold two overlapping
    // subscriptions with no refund path. Reuse a checkout that is still live
    // instead: same plan, same player, still pending, still inside the window
    // where its SATIM page works.
    const reusable = await db.payment.findFirst({
      where: {
        playerId,
        planId: plan.id,
        provider: "slickpay",
        status: "pending",
        providerUrl: { not: null },
        providerMode: config.mode,
        createdAt: { gt: new Date(Date.now() - CHECKOUT_REUSE_MS) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (reusable?.providerUrl) {
      return NextResponse.json(
        { url: reusable.providerUrl, paymentId: reusable.id, reused: true },
        { status: 200 },
      );
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
        // The rounded figure, not plan.price — this is what SlickPay is asked
        // to charge, so recording the unrounded price instead would leave a
        // permanent few-centimes gap between what the player paid and what the
        // books say, and would trip settlement's own amount check.
        amount,
        status: "pending",
        provider: "slickpay",
        providerStatus: "unpaid",
        // Pin the environment, so settlement reads the invoice back from the
        // host that issued it even if the mode is switched meanwhile.
        providerMode: config.mode,
        stationId: player.stationId ?? null,
      },
    });

    const base = appUrl();
    // Non-null by construction: missingContactFields() above rejects any name
    // splitName() cannot handle.
    const { firstname, lastname } = splitName(player.fullName)!;

    // SlickPay requires an address too, but blocking a payment over a field
    // the academy never asks players to fill in would be needlessly hostile —
    // it is a billing formality here, not a delivery address. Fall back to the
    // academy's own address, then to the city, so the invoice is always valid.
    const address =
      player.address?.trim() ||
      (await getSetting("academy_address", "")).trim() ||
      "Algeria";

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
        email: contactEmail(player),
        address,
        note: `Subscription: ${plan.name}`,
        items: [{ name: plan.name, price: amount, quantity: 1 }],
      });
    } catch (error) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          // "rejected", not a new "failed" status: the admin table filters and
          // badge map only know pending/approved/rejected, and a payment that
          // never reached a card is closed either way.
          status: "rejected",
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
        // Sanitised: the create response echoes back the `webhook_signature`
        // we just sent, so storing it verbatim would write our shared webhook
        // secret into every payment row at the moment of checkout.
        providerPayload: JSON.stringify(sanitizeProviderPayload(invoice.raw)),
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
