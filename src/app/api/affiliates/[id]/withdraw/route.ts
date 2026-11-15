import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // An affiliate requests a payout of their own balance; affiliate managers may
  // file one for anyone. Before this, any login could file one for any id.
  const affiliate = await db.affiliate.findUnique({ where: { id }, select: { userId: true } });
  if (!affiliate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isOwner = affiliate.userId === session.user.id && (await hasPermission(session.user.id, PERMISSIONS.AFFILIATE_VIEW));
  if (!isOwner && !(await hasPermission(session.user.id, PERMISSIONS.AFFILIATES_MANAGE))) {
    return NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 });
  }
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
