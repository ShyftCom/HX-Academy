import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
    ];
  }
  if (status) where.status = status;
  if (category) where.category = category;

  const [data, total] = await Promise.all([
    db.player.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, lastLogin: true } },
        subscriptions: { where: { status: "active" }, include: { plan: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.player.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.fullName) return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    if (!body.email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

    const playerRole = await db.role.findFirst({ where: { name: "Player" } });
    const password = await hashPassword(body.phone ?? "hxacademy123");

    const user = await db.user.create({
      data: { name: body.fullName, email: body.email, password, roleId: playerRole?.id ?? null, isActive: true },
    });

    const player = await db.player.create({
      data: {
        userId: user.id,
        fullName: body.fullName,
        photo: body.photo ?? null,
        phone: body.phone ?? null,
        email: body.email,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        age: body.age ?? null,
        gender: body.gender ?? null,
        parentName: body.parentName ?? null,
        parentPhone: body.parentPhone ?? null,
        address: body.address ?? null,
        emergencyContact: body.emergencyContact ?? null,
        team: body.team ?? null,
        category: body.category ?? null,
        position: body.position ?? null,
        medicalNotes: body.medicalNotes ?? null,
        notes: body.notes ?? null,
        status: "active",
      },
    });

    await logActivity({ userId: session.user.id, action: "create", module: "players", description: `Created player: ${player.fullName}` });
    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
