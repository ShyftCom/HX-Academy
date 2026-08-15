import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addMonths, addYears } from "date-fns";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Any subscription by id, with no ownership check — back-office read.
  const denied = await requirePermissionResponse(PERMISSIONS.SUBS_VIEW);
  if (denied) return denied;
  const { id } = await params;
  const sub = await db.subscription.findUnique({ where: { id }, include: { player: true, plan: true, payments: true } });
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sub);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Changes a subscription's status or dates — i.e. whether a player currently
  // has access, and until when.
  const denied = await requirePermissionResponse(PERMISSIONS.SUBS_EDIT);
  if (denied) return denied;
  const { id } = await params;
  try {
    const body = await req.json();
    const sub = await db.subscription.findUnique({ where: { id }, include: { plan: true } });
    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let updateData: Record<string, unknown> = { status: body.status };

    if (body.status === "active" && sub.status !== "active") {
      const start = body.startDate ? new Date(body.startDate) : new Date();
      const end = sub.plan.durationType === "year"
        ? addYears(start, sub.plan.duration)
        : addMonths(start, sub.plan.duration);
      updateData = { ...updateData, startDate: start, endDate: end };
    }

    const updated = await db.subscription.update({ where: { id }, data: updateData, include: { plan: true, player: true } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.SUBS_DELETE);
  if (denied) return denied;
  const { id } = await params;
  try {
    await db.subscription.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
