import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const affiliates = await db.affiliate.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      station: { select: { id: true, name: true } },
      _count: { select: { referrals: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = await Promise.all(
    affiliates.map(async (a) => {
      const [earned, withdrawn, paidCount] = await Promise.all([
        db.affiliateEarning.aggregate({ where: { affiliateId: a.id, status: "approved" }, _sum: { amount: true } }),
        db.affiliateWithdrawal.aggregate({ where: { affiliateId: a.id, status: "approved" }, _sum: { amount: true } }),
        db.affiliateReferral.count({ where: { affiliateId: a.id, paymentStatus: "paid" } }),
      ]);
      const balance = Number(earned._sum.amount ?? 0) - Number(withdrawn._sum.amount ?? 0);
      return { ...a, balance, paidCount, unpaidCount: a._count.referrals - paidCount };
    })
  );

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, commissionRate, stationId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const existing = await db.affiliate.findUnique({ where: { userId } });
  if (existing) return NextResponse.json({ error: "User already has an affiliate account" }, { status: 409 });

  let code: string;
  do {
    code = Math.random().toString(36).substring(2, 10).toUpperCase();
  } while (await db.affiliate.findUnique({ where: { code } }));

  const affiliate = await db.affiliate.create({
    data: { userId, code, commissionRate: commissionRate ?? 0, stationId: stationId ?? null, createdById: session.user.id },
  });

  return NextResponse.json(affiliate, { status: 201 });
}
