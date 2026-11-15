import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.FINANCE_VIEW);
  if (denied) return denied;
  const { id } = await params;
  const charge = await db.charge.findUnique({ where: { id }, include: { category: true } });
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
  const charge = await db.charge.update({
    where: { id },
    data: {
      title: body.title,
      amount: body.amount,
      chargeDate: body.chargeDate ? new Date(body.chargeDate) : undefined,
      categoryId: body.categoryId ?? undefined,
      notes: body.notes ?? undefined,
      isSalary: body.isSalary !== undefined ? body.isSalary : undefined,
    },
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
