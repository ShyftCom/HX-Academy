import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");

  const sessions = await db.summerCampSession.findMany({
    where: stationId ? { stationId } : {},
    include: { _count: { select: { enrollments: true } }, station: { select: { id: true, name: true } } },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const body = await req.json();
  const { name, startDate, endDate, capacity, price, description, stationId } = body;

  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: "name, startDate, endDate required" }, { status: 400 });
  }

  const campSession = await db.summerCampSession.create({
    data: {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      capacity: capacity ? Number(capacity) : null,
      price: price ? Number(price) : null,
      description: description ?? null,
      nameFr: body.nameFr ?? null,
      nameAr: body.nameAr ?? null,
      descriptionFr: body.descriptionFr ?? null,
      descriptionAr: body.descriptionAr ?? null,
      stationId: stationId ?? null,
    },
    include: { _count: { select: { enrollments: true } }, station: { select: { id: true, name: true } } },
  });

  return NextResponse.json(campSession, { status: 201 });
}
