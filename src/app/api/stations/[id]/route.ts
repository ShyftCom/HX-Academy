import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const station = await db.station.findUnique({
    where: { id },
    include: {
      stationStaff: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { players: true, leads: true, meetings: true } },
    },
  });
  if (!station) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(station);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const station = await db.station.update({
    where: { id },
    data: {
      name: body.name,
      wilaya: body.wilaya,
      wilayaCode: body.wilayaCode ? Number(body.wilayaCode) : undefined,
      address: body.address,
      phone: body.phone,
      email: body.email,
      whatsapp: body.whatsapp,
      logoUrl: body.logoUrl,
      status: body.status,
    },
  });
  return NextResponse.json(station);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.station.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
