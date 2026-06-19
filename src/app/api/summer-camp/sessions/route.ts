import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      stationId: stationId ?? null,
    },
    include: { _count: { select: { enrollments: true } }, station: { select: { id: true, name: true } } },
  });

  return NextResponse.json(campSession, { status: 201 });
}
