import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const current = await db.payroll.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bonuses = body.bonuses !== undefined ? Number(body.bonuses) : Number(current.bonuses);
  const deductions = body.deductions !== undefined ? Number(body.deductions) : Number(current.deductions);
  const absencesDeduction = Number(current.absencesDeduction);
  const netSalary = Number(current.baseSalary) + bonuses - deductions - absencesDeduction;

  const payroll = await db.payroll.update({
    where: { id },
    data: { bonuses, deductions, netSalary, notes: body.notes ?? current.notes },
  });
  return NextResponse.json(payroll);
}
