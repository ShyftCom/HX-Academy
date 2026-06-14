import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const payroll = await db.payroll.findUnique({
    where: { id },
    include: { staff: true },
  });
  if (!payroll) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (payroll.status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 400 });

  const salariesCategory = await db.chargeCategory.findFirst({ where: { name: "Salaries", isGlobal: true } });

  await db.$transaction([
    db.payroll.update({
      where: { id },
      data: { status: "paid", paidAt: new Date(), paidById: session.user.id },
    }),
    db.charge.create({
      data: {
        title: `Salary — ${payroll.staff.fullName} (${payroll.month}/${payroll.year})`,
        amount: payroll.netSalary,
        chargeDate: new Date(),
        isSalary: true,
        staffId: payroll.staffId,
        stationId: payroll.stationId ?? null,
        categoryId: salariesCategory?.id ?? null,
        paidById: session.user.id,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
