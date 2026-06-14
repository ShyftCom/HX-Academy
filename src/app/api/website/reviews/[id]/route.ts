import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
  if (body.isVerified !== undefined) updateData.isVerified = body.isVerified;
  if (body.adminReply !== undefined) {
    updateData.adminReply = body.adminReply;
    updateData.adminReplyAt = new Date();
    updateData.adminReplyBy = session.user.id;
  }

  const review = await db.review.update({ where: { id }, data: updateData });
  return NextResponse.json(review);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.review.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
