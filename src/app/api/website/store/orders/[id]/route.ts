import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await db.websiteOrder.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { name: true, images: true } } } },
      lead: { select: { id: true, fullName: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const order = await db.websiteOrder.update({
    where: { id },
    data: {
      status: body.status ?? undefined,
    },
    include: { items: { include: { product: { select: { name: true } } } } },
  });

  // If status changed to "delivered", send review invite email
  if (body.status === "delivered" && order.customerEmail) {
    try {
      const { signReviewToken } = await import("@/lib/review-token");
      const token = signReviewToken(order.id, order.customerEmail);
      const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/review?order_id=${order.id}&token=${token}`;

      const { sendMail } = await import("@/lib/mailer");
      await sendMail({
        to: order.customerEmail,
        subject: "Share your experience — leave a review!",
        html: `<p>Hi ${order.customerName},</p><p>We hope you're enjoying your order! Please take a moment to <a href="${reviewUrl}">leave us a review</a>.</p>`,
      });
    } catch {}
  }

  return NextResponse.json(order);
}
