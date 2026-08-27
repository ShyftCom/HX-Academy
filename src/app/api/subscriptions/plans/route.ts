import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  // Deliberately session-only, NOT gated on subscriptions:view. The player
  // portal reads this to show the plans a player can buy, and players hold no
  // subscriptions:* permission — gating it would empty the renewal dialog.
  // Plan name, price and duration are the catalogue; there is nothing here
  // that belongs to another player.
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const plans = await db.subscriptionPlan.findMany({ orderBy: { price: "asc" } });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  // Creating a plan sets what the academy charges — the price the self-service
  // payment path now reads server-side.
  const denied = await requirePermissionResponse(PERMISSIONS.SUBS_CREATE);
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!body.name || !body.price || !body.duration) {
      return NextResponse.json({ error: "Name, price, and duration are required" }, { status: 400 });
    }
    const plan = await db.subscriptionPlan.create({
      data: {
        name: body.name,
        nameFr: body.nameFr ?? null,
        nameAr: body.nameAr ?? null,
        description: body.description ?? null,
        descriptionFr: body.descriptionFr ?? null,
        descriptionAr: body.descriptionAr ?? null,
        duration: parseInt(body.duration),
        durationType: body.durationType ?? "month",
        price: parseFloat(body.price),
        color: body.color ?? "#3B82F6",
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
