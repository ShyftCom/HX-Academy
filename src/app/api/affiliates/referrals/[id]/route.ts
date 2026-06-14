import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { amountPaid } = await req.json();

  const referral = await db.affiliateReferral.findUnique({
    where: { id },
    include: { affiliate: true },
  });
  if (!referral) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updatedReferral] = await db.$transaction([
    db.affiliateReferral.update({
      where: { id },
      data: { paymentStatus: "paid", amountPaid, paidAt: new Date() },
    }),
    db.affiliateEarning.create({
      data: {
        affiliateId: referral.affiliateId,
        referralId: id,
        amount: Number(amountPaid) * (Number(referral.affiliate.commissionRate) / 100),
        status: "approved",
      },
    }),
  ]);

  return NextResponse.json(updatedReferral);
}
