import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity, createNotification } from "@/lib/activity";
import { addMonths, addYears } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const playerId = searchParams.get("playerId") ?? "";
  const status = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = {};
  if (playerId) where.playerId = playerId;
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    db.subscription.findMany({
      where,
      include: { player: true, plan: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.subscription.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.playerId || !body.planId) {
      return NextResponse.json({ error: "Player and plan are required" }, { status: 400 });
    }

    const plan = await db.subscriptionPlan.findUnique({ where: { id: body.planId } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (body.status === "active") {
      startDate = body.startDate ? new Date(body.startDate) : new Date();
      endDate = plan.durationType === "year"
        ? addYears(startDate, plan.duration)
        : addMonths(startDate, plan.duration);
    }

    const subscription = await db.subscription.create({
      data: {
        playerId: body.playerId,
        planId: body.planId,
        startDate,
        endDate,
        status: body.status ?? "pending",
        notes: body.notes ?? null,
      },
      include: { player: true, plan: true },
    });

    await logActivity({
      userId: session.user.id,
      action: "create",
      module: "subscriptions",
      description: `Created subscription for ${subscription.player.fullName} - ${subscription.plan.name}`,
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
