import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const charge = await db.charge.findUnique({ where: { id }, include: { category: true } });
  if (!charge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(charge);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
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
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.charge.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
