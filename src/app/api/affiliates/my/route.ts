import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const affiliate = await db.affiliate.findUnique({
    where: { userId: session.user.id },
    include: {
      referrals: {
        include: { player: { select: { fullName: true } }, station: { select: { name: true } } },
        orderBy: { registrationDate: "desc" },
      },
      earnings: { orderBy: { createdAt: "desc" } },
      withdrawals: { orderBy: { requestedAt: "desc" } },
    },
  });
  if (!affiliate) return NextResponse.json({ error: "No affiliate account" }, { status: 404 });

  const [earned, withdrawn] = await Promise.all([
    db.affiliateEarning.aggregate({ where: { affiliateId: affiliate.id, status: "approved" }, _sum: { amount: true } }),
    db.affiliateWithdrawal.aggregate({ where: { affiliateId: affiliate.id, status: "approved" }, _sum: { amount: true } }),
  ]);
  const balance = Number(earned._sum.amount ?? 0) - Number(withdrawn._sum.amount ?? 0);

  return NextResponse.json({ ...affiliate, balance });
}
