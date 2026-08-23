import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureLocationSchedule } from "@/lib/schedule";

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

  // A new location arrives with its own empty, independent schedule. Created in
  // the same transaction as the station so a location can never exist without one.
  const station = await db.$transaction(async (tx) => {
    const created = await tx.station.create({
      data: { name, wilaya, wilayaCode: wilayaCode ? Number(wilayaCode) : null, address, phone, email, whatsapp, logoUrl },
    });
    await ensureLocationSchedule(tx, created.id);
    return created;
  });

  return NextResponse.json(station, { status: 201 });
}
