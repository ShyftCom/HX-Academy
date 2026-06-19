import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("station_id");

  const sponsors = await db.websiteSponsor.findMany({
    where: { isActive: true, ...(stationId ? { stationId } : { stationId: null }) },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(sponsors);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { stationId, name, logoUrl, websiteUrl } = body;

  if (!name || !logoUrl) return NextResponse.json({ error: "name and logoUrl required" }, { status: 400 });

  const count = await db.websiteSponsor.count({ where: { stationId: stationId ?? null } });

  const sponsor = await db.websiteSponsor.create({
    data: {
      stationId: stationId ?? null,
      name,
      logoUrl,
      websiteUrl: websiteUrl ?? null,
      position: count,
    },
  });

  return NextResponse.json(sponsor, { status: 201 });
}
