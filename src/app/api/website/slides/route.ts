import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("station_id");

  const slides = await db.websiteSlide.findMany({
    where: { isActive: true, ...(stationId ? { stationId } : { stationId: null }) },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(slides);
}

export async function POST(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const body = await req.json();
  const { stationId, imageUrl, title, titleFr, titleAr, subtitle, subtitleFr, subtitleAr, ctaLabel, ctaUrl, position } = body;

  if (!imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

  const count = await db.websiteSlide.count({ where: { stationId: stationId ?? null } });

  const slide = await db.websiteSlide.create({
    data: {
      stationId: stationId ?? null,
      imageUrl,
      title: title ?? null,
      titleFr: titleFr ?? null,
      titleAr: titleAr ?? null,
      subtitle: subtitle ?? null,
      subtitleFr: subtitleFr ?? null,
      subtitleAr: subtitleAr ?? null,
      ctaLabel: ctaLabel ?? null,
      ctaUrl: ctaUrl ?? null,
      position: position ?? count,
    },
  });

  return NextResponse.json(slide, { status: 201 });
}
