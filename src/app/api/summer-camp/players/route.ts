import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const q = searchParams.get("q") ?? "";
  const sessionId = searchParams.get("sessionId") ?? "";
  const stationId = searchParams.get("stationId") ?? "";
  const status = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { guardianName: { contains: q, mode: "insensitive" } },
      { guardianPhone: { contains: q, mode: "insensitive" } },
    ];
  }
  if (sessionId) where.sessionId = sessionId;
  if (stationId) where.stationId = stationId;
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    db.summerCampPlayer.findMany({
      where,
      include: {
        session: { select: { id: true, name: true, startDate: true, endDate: true } },
        station: { select: { id: true, name: true } },
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.summerCampPlayer.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { fullName, dateOfBirth, age, gender, healthNotes, guardianName, guardianPhone, guardianEmail, guardianRelation, sessionId, stationId, notes, paymentStatus, paidAmount, leadId } = body;

  if (!fullName) return NextResponse.json({ error: "fullName required" }, { status: 400 });

  const player = await db.summerCampPlayer.create({
    data: {
      leadId: leadId ?? null,
      fullName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      age: age ? Number(age) : null,
      gender: gender ?? null,
      healthNotes: healthNotes ?? null,
      notes: notes ?? null,
      guardianName: guardianName ?? null,
      guardianPhone: guardianPhone ?? null,
      guardianEmail: guardianEmail ?? null,
      guardianRelation: guardianRelation ?? null,
      sessionId: sessionId ?? null,
      stationId: stationId ?? null,
      paymentStatus: paymentStatus ?? "unpaid",
      paidAmount: paidAmount ? Number(paidAmount) : null,
    },
    include: { session: { select: { id: true, name: true } } },
  });

  return NextResponse.json(player, { status: 201 });
}
