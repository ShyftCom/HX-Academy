import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

// No UI calls any handler in this file — it is reachable only by hand-crafted
// request, which is precisely why it was never noticed to be ungated.

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Any payment by id, including the receipt image, with no ownership check.
  const denied = await requirePermissionResponse(PERMISSIONS.PAYMENTS_VIEW);
  if (denied) return denied;
  const { id } = await params;
  const payment = await db.payment.findUnique({
    where: { id },
    include: { player: true, plan: true, paymentMethod: true, subscription: true },
  });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(payment);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rewrites the amount and the receipt on a recorded payment — the evidence
  // that money arrived — so it takes its own permission rather than reusing
  // payments:create.
  const denied = await requirePermissionResponse(PERMISSIONS.PAYMENTS_EDIT);
  if (denied) return denied;
  const { id } = await params;
  try {
    const body = await req.json();
    const payment = await db.payment.update({
      where: { id },
      data: {
        amount: body.amount ? parseFloat(body.amount) : undefined,
        proof: body.proof ?? undefined,
        adminNotes: body.adminNotes ?? undefined,
        paymentMethodId: body.paymentMethodId ?? undefined,
      },
      include: { player: true, plan: true, paymentMethod: true },
    });
    return NextResponse.json(payment);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Erases the record of a payment entirely.
  const denied = await requirePermissionResponse(PERMISSIONS.PAYMENTS_DELETE);
  if (denied) return denied;
  const { id } = await params;
  try {
    await db.payment.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
