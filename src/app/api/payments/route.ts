import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity, createNotification } from "@/lib/activity";
import { hasPermission, requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  // This returns every payment in the academy — player names, amounts and the
  // receipt images — with no per-caller filter. auth() alone therefore let any
  // signed-in player page through the finances of every other family.
  // The player portal never calls this route; it reads its own payments from
  // the nested `payments` of /api/players/[id], so requiring payments:view
  // costs it nothing.
  const denied = await requirePermissionResponse(PERMISSIONS.PAYMENTS_VIEW);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const playerId = searchParams.get("playerId") ?? "";

  const stationId = searchParams.get("stationId") ?? "";

  const where: Record<string, unknown> = {};
  const playerFilter: Record<string, unknown> = {};
  if (q) playerFilter.fullName = { contains: q };
  if (stationId) playerFilter.stationId = stationId;
  if (Object.keys(playerFilter).length > 0) where.player = playerFilter;
  if (status) where.status = status;
  if (playerId) where.playerId = playerId;

  const [data, total] = await Promise.all([
    db.payment.findMany({
      where,
      include: { player: true, plan: true, paymentMethod: true, subscription: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.payment.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

/**
 * Records a payment. Two callers share this route, and they are not equally
 * trusted:
 *
 *   - the back office (payments:create) files a payment on a player's behalf
 *     and may set the status, the notes and the amount it actually received;
 *   - the player portal submits its own receipt for review.
 *
 * Previously both were gated on auth() alone and the body was copied straight
 * into the row, so a player could POST `status: "approved"` and mint a
 * settled-looking payment that no one had approved, or pass someone else's
 * `playerId` and file a payment against their account. Neither grants a
 * subscription by itself — activation only ever happens in activatePayment() —
 * but a forged "approved" row is what an admin reads when deciding whether a
 * family has paid, which is the whole point of the record.
 *
 * So the self-service path no longer takes the caller's word for any field
 * that decides whether money arrived: the player is resolved from the session,
 * the status is forced to pending, and the amount comes from the plan. That
 * mirrors the SlickPay checkout, which already refuses a client-sent amount.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isBackOffice = await hasPermission(session.user.id, PERMISSIONS.PAYMENTS_CREATE);

  try {
    const body = await req.json();
    if (!body.planId) {
      return NextResponse.json({ error: "Plan is required" }, { status: 400 });
    }

    let playerId: string;
    let amount: number;
    let status: string;
    let adminNotes: string | null;

    if (isBackOffice) {
      if (!body.playerId || !body.amount) {
        return NextResponse.json({ error: "Player, plan, and amount are required" }, { status: 400 });
      }
      playerId = body.playerId;
      amount = parseFloat(body.amount);
      status = body.status ?? "pending";
      adminNotes = body.adminNotes ?? null;
    } else {
      // Self-service. Bind the payment to the caller's own player record and
      // ignore any playerId they sent.
      const own = await db.player.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!own) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // The price is whatever the plan costs today, not what the client says.
      const plan = await db.subscriptionPlan.findUnique({
        where: { id: body.planId },
        select: { price: true },
      });
      if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

      playerId = own.id;
      amount = Number(plan.price);
      status = "pending";
      adminNotes = null;
    }

    if (!Number.isFinite(amount)) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const payment = await db.payment.create({
      data: {
        playerId,
        planId: body.planId,
        subscriptionId: body.subscriptionId ?? null,
        paymentMethodId: body.paymentMethodId ?? null,
        amount,
        proof: body.proof ?? null,
        status,
        adminNotes,
      },
      include: { player: true, plan: true, paymentMethod: true },
    });

    // Notify admins of new payment
    const adminUsers = await db.user.findMany({
      where: { role: { name: { in: ["Admin", "Super Admin"] } } },
      select: { id: true },
    });
    for (const admin of adminUsers) {
      await createNotification({
        userId: admin.id,
        title: "New Payment Submitted",
        message: `${payment.player.fullName} submitted a payment of ${payment.amount} DA`,
        type: "info",
        link: "/dashboard/payments",
      });
    }

    await logActivity({
      userId: session.user.id,
      action: "create",
      module: "payments",
      description: `Payment created for ${payment.player.fullName} - ${payment.amount} DA`,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
