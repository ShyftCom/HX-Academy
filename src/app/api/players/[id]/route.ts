import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const player = await db.player.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, lastLogin: true, isActive: true } },
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" } },
      payments: { include: { plan: true, paymentMethod: true }, orderBy: { createdAt: "desc" } },
      orders: { include: { items: { include: { product: true } }, status: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  return NextResponse.json(player);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const player = await db.player.update({
      where: { id },
      data: {
        fullName: body.fullName,
        photo: body.photo ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
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
      },
    });
    if (body.fullName) {
      await db.user.update({ where: { id: player.userId }, data: { name: body.fullName } });
    }
    await logActivity({ userId: session.user.id, action: "update", module: "players", description: `Updated player: ${player.fullName}` });
    return NextResponse.json(player);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();

    if (body.password) {
      if (body.password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      const player = await db.player.findUnique({ where: { id } });
      if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
      const hashed = await hashPassword(body.password);
      await db.user.update({ where: { id: player.userId }, data: { password: hashed } });
      await logActivity({ userId: session.user.id, action: "update", module: "players", description: `Reset password for player: ${player.fullName}` });
      return NextResponse.json({ message: "Password updated" });
    }

    const player = await db.player.update({
      where: { id },
      data: { status: body.status },
    });
    await db.user.update({ where: { id: player.userId }, data: { isActive: body.status === "active" } });
    await logActivity({ userId: session.user.id, action: "status_change", module: "players", description: `Set player ${player.fullName} to ${body.status}` });
    return NextResponse.json(player);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const player = await db.player.findUnique({ where: { id } });
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    await db.user.delete({ where: { id: player.userId } });
    await logActivity({ userId: session.user.id, action: "delete", module: "players", description: `Deleted player: ${player.fullName}` });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
