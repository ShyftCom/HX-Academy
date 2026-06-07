import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const plans = await db.subscriptionPlan.findMany({ orderBy: { price: "asc" } });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.name || !body.price || !body.duration) {
      return NextResponse.json({ error: "Name, price, and duration are required" }, { status: 400 });
    }
    const plan = await db.subscriptionPlan.create({
      data: {
        name: body.name,
        description: body.description ?? null,
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
