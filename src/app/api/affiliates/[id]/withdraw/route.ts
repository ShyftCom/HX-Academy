import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { amount } = await req.json();

  const [earned, withdrawn] = await Promise.all([
    db.affiliateEarning.aggregate({ where: { affiliateId: id, status: "approved" }, _sum: { amount: true } }),
    db.affiliateWithdrawal.aggregate({ where: { affiliateId: id, status: "approved" }, _sum: { amount: true } }),
  ]);
  const balance = Number(earned._sum.amount ?? 0) - Number(withdrawn._sum.amount ?? 0);

  if (Number(amount) > balance) return NextResponse.json({ error: "Amount exceeds balance" }, { status: 400 });
  if (Number(amount) <= 0) return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });

  const withdrawal = await db.affiliateWithdrawal.create({
    data: { affiliateId: id, amount, status: "pending" },
  });
  return NextResponse.json(withdrawal, { status: 201 });
}
