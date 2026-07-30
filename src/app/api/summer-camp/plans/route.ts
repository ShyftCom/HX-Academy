import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId") ?? "";
  const activeOnly = searchParams.get("activeOnly") !== "false";

  const where: Record<string, unknown> = {};
  if (activeOnly) where.isActive = true;
  if (stationId) where.stationId = stationId;

  const plans = await db.summerCampPlan.findMany({
    where,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const maxOrder = await db.summerCampPlan.findFirst({ orderBy: { order: "desc" } });

    const plan = await db.summerCampPlan.create({
      data: {
        name: body.name,
        programTrack: body.programTrack ?? null,
        price: parseFloat(body.price) || 0,
        description: body.description ?? null,
        isActive: body.isActive ?? true,
        order: body.order ?? (maxOrder?.order ?? -1) + 1,
        stationId: body.stationId ?? null,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
