import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import { parsePayerFields } from "@/lib/charge-input";
import { parseDayRange } from "@/lib/date-range";

const DETAIL_INCLUDE = {
  category: true,
  paidBy: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  staff: { select: { fullName: true } },
} as const;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.FINANCE_VIEW);
  if (denied) return denied;
  const { id } = await params;
  const charge = await db.charge.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  if (!charge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(charge);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Rewriting a recorded charge changes the books after the fact — Super Admin
  // only by default (charges:edit is never seeded onto a role).
  const denied = await requirePermissionResponse(PERMISSIONS.CHARGES_EDIT);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();
  const existing = await db.charge.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let chargeDate: Date | undefined;
  if (body.chargeDate) {
    const day = typeof body.chargeDate === "string" ? parseDayRange(body.chargeDate.slice(0, 10), null) : null;
    if (!day || "error" in day) return NextResponse.json({ error: "Invalid date", code: "invalid_date" }, { status: 400 });
    chargeDate = day.range.gte;
  }
  if (body.amount !== undefined && !(Number(body.amount) > 0)) return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  const payer = await parsePayerFields(body);
  if (payer instanceof NextResponse) return payer;

  const charge = await db.charge.update({
    where: { id },
    data: {
      title: body.title,
      amount: body.amount,
      chargeDate,
      // "" clears the category; absent leaves it.
      categoryId: body.categoryId === undefined ? undefined : body.categoryId || null,
      notes: body.notes === undefined ? undefined : (typeof body.notes === "string" && body.notes.trim()) || null,
      isSalary: body.isSalary !== undefined ? body.isSalary : undefined,
      ...payer,
    },
    include: DETAIL_INCLUDE,
  });
  return NextResponse.json(charge);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.CHARGES_DELETE);
  if (denied) return denied;
  const { id } = await params;
  const existing = await db.charge.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.charge.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
