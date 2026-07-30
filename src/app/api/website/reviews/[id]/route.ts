import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;
  const session = await auth();

  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
  if (body.isVerified !== undefined) updateData.isVerified = body.isVerified;
  if (body.adminReply !== undefined) {
    updateData.adminReply = body.adminReply;
    updateData.adminReplyAt = new Date();
    updateData.adminReplyBy = session?.user?.id ?? null;
  }

  const review = await db.review.update({ where: { id }, data: updateData });
  return NextResponse.json(review);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  await db.review.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
