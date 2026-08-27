import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  // The back-office orders board reads this to build its status columns.
  // The store checkout does not — a new order takes the default status
  // server-side — so this is not player-facing.
  const denied = await requirePermissionResponse(PERMISSIONS.ORDERS_VIEW);
  if (denied) return denied;

  const statuses = await db.orderStatus.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(statuses);
}

export async function POST(req: NextRequest) {
  // Order statuses are the configuration of the fulfilment workflow rather
  // than orders themselves, so all three writes take orders:edit — deleting
  // a status is not the same authority as deleting an order. No UI calls
  // them at all; they are reachable only by hand-crafted request.
  const denied = await requirePermissionResponse(PERMISSIONS.ORDERS_EDIT);
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const count = await db.orderStatus.count();
    const status = await db.orderStatus.create({
      data: { name: body.name, color: body.color ?? "#6B7280", order: count, isDefault: body.isDefault ?? false },
    });
    return NextResponse.json(status, { status: 201 });
  } catch { return NextResponse.json({ error: "Create failed" }, { status: 500 }); }
}
