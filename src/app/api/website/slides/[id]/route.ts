import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const slide = await db.websiteSlide.update({
    where: { id },
    data: {
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.titleFr !== undefined && { titleFr: body.titleFr }),
      ...(body.titleAr !== undefined && { titleAr: body.titleAr }),
      ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
      ...(body.subtitleFr !== undefined && { subtitleFr: body.subtitleFr }),
      ...(body.subtitleAr !== undefined && { subtitleAr: body.subtitleAr }),
      ...(body.ctaLabel !== undefined && { ctaLabel: body.ctaLabel }),
      ...(body.ctaUrl !== undefined && { ctaUrl: body.ctaUrl }),
      ...(body.position !== undefined && { position: body.position }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return NextResponse.json(slide);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.websiteSlide.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
