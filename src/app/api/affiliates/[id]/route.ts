import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const affiliate = await db.affiliate.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      station: { select: { id: true, name: true } },
      referrals: {
        include: { player: { select: { id: true, fullName: true } }, station: { select: { name: true } } },
        orderBy: { registrationDate: "desc" },
      },
      earnings: { orderBy: { createdAt: "desc" } },
      withdrawals: { orderBy: { requestedAt: "desc" } },
    },
  });
  if (!affiliate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [earned, withdrawn] = await Promise.all([
    db.affiliateEarning.aggregate({ where: { affiliateId: id, status: "approved" }, _sum: { amount: true } }),
    db.affiliateWithdrawal.aggregate({ where: { affiliateId: id, status: "approved" }, _sum: { amount: true } }),
  ]);
  const balance = Number(earned._sum.amount ?? 0) - Number(withdrawn._sum.amount ?? 0);

  return NextResponse.json({ ...affiliate, balance });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const affiliate = await db.affiliate.update({
    where: { id },
    data: {
      ...(body.commissionRate !== undefined && { commissionRate: body.commissionRate }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });
  return NextResponse.json(affiliate);
}
