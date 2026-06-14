import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stations = await db.station.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { players: true, leads: true } },
    },
  });

  return NextResponse.json(stations);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, wilaya, wilayaCode, address, phone, email, whatsapp, logoUrl } = body;

  if (!name || !wilaya) return NextResponse.json({ error: "name and wilaya are required" }, { status: 400 });

  const station = await db.station.create({
    data: { name, wilaya, wilayaCode: wilayaCode ? Number(wilayaCode) : null, address, phone, email, whatsapp, logoUrl },
  });

  return NextResponse.json(station, { status: 201 });
}
