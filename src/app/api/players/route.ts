import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import { generatePassword } from "@/lib/generate-password";
import { peopleSearchWhere } from "@/lib/search";

export async function GET(req: NextRequest) {
  // The academy's whole roster — every player's name, phone and email — with
  // no per-caller filter. The player portal never calls this; it reads its own
  // record from /api/players/[id].
  const denied = await requirePermissionResponse(PERMISSIONS.PLAYERS_VIEW);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
  const stationId = searchParams.get("stationId") ?? "";

  const where: Record<string, unknown> = {};
  const search = await peopleSearchWhere(q, {
    table: "players",
    textFields: ["fullName", "email", "phone", "parentName", "parentPhone"],
    phoneColumns: ["phone", "parentPhone"],
  });
  if (search) where.AND = [search];
  if (status) where.status = status;
  if (category) where.category = category;
  // "none" finds players that were never assigned a station.
  if (stationId) where.stationId = stationId === "none" ? null : stationId;

  const [data, total] = await Promise.all([
    db.player.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, lastLogin: true } },
        subscriptions: { where: { status: "active" }, include: { plan: true }, take: 1 },
        station: { select: { id: true, name: true } },
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
  // This does not just create a player row: it creates the linked *user
  // account*. On auth() alone any signed-in user could mint accounts on the
  // academy's login.
  const denied = await requirePermissionResponse(PERMISSIONS.PLAYERS_CREATE);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.fullName) return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    if (!body.email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const existing = await db.user.findUnique({
      where: { email: body.email },
      include: { role: true, _count: { select: { players: true } } },
    });
    // An email that already has children on it is a parent's login: the new
    // player is a sibling and joins that account, keeping its password. Any
    // other existing login — staff, or a bare account — is still refused.
    const joiningFamily = !!existing && existing._count.players > 0 && (!existing.role || existing.role.name === "Player");
    if (existing && !joiningFamily) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

    let plainPassword: string | null = null;
    let user;
    if (joiningFamily) {
      user = existing!;
    } else {
      const chosen: string = (body.password ?? "").trim() || generatePassword();
      if (chosen.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      plainPassword = chosen;
      const playerRole = await db.role.findFirst({ where: { name: "Player" } });
      const password = await hashPassword(chosen);
      user = await db.user.create({
        data: { name: body.fullName, email: body.email, password, roleId: playerRole?.id ?? null, isActive: true },
      });
    }

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
    // The plaintext password is returned exactly once, to the admin who just
    // set it, so they can pass it to the player. It is never stored or logged.
    // A sibling added to a family account gets no password back — the family
    // already signs in with theirs.
    return NextResponse.json(
      { ...player, credentials: { email: body.email, password: plainPassword }, joinedExistingAccount: joiningFamily },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
