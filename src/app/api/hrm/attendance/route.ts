import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");
  const stationId = searchParams.get("stationId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const now = new Date();
  const y = year ? parseInt(year) : now.getFullYear();
  const m = month ? parseInt(month) : now.getMonth() + 1;
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0, 23, 59, 59);

  const records = await db.attendance.findMany({
    where: {
      ...(staffId ? { staffId } : {}),
      ...(stationId && !staffId ? { staff: { stationId } } : {}),
      date: { gte: from, lte: to },
    },
    include: { staff: { select: { fullName: true, stationId: true } } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(records);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { staffId, date, status, checkIn, checkOut, notes } = body;

  if (!staffId || !date || !status) return NextResponse.json({ error: "staffId, date, status required" }, { status: 400 });

  const record = await db.attendance.upsert({
    where: { staffId_date: { staffId, date: new Date(date) } },
    update: { status, checkIn: checkIn ?? null, checkOut: checkOut ?? null, notes: notes ?? null, recordedById: session.user.id },
    create: { staffId, date: new Date(date), status, checkIn: checkIn ?? null, checkOut: checkOut ?? null, notes: notes ?? null, recordedById: session.user.id },
  });
  return NextResponse.json(record);
}
