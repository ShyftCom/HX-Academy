import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();

  const sponsor = await db.websiteSponsor.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
      ...(body.websiteUrl !== undefined && { websiteUrl: body.websiteUrl }),
      ...(body.position !== undefined && { position: body.position }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return NextResponse.json(sponsor);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  await db.websiteSponsor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
