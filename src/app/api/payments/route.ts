import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity, createNotification } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const playerId = searchParams.get("playerId") ?? "";

  const where: Record<string, unknown> = {};
  if (q) where.player = { fullName: { contains: q } };
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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.playerId || !body.planId || !body.amount) {
      return NextResponse.json({ error: "Player, plan, and amount are required" }, { status: 400 });
    }

    const payment = await db.payment.create({
      data: {
        playerId: body.playerId,
        planId: body.planId,
        subscriptionId: body.subscriptionId ?? null,
        paymentMethodId: body.paymentMethodId ?? null,
        amount: parseFloat(body.amount),
        proof: body.proof ?? null,
        status: body.status ?? "pending",
        adminNotes: body.adminNotes ?? null,
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
