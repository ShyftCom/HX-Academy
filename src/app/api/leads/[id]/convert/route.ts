import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity, createNotification } from "@/lib/activity";
import { logLeadActivity } from "@/lib/lead-activity";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const lead = await db.lead.findUnique({ where: { id }, include: { status: true } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (lead.isConverted) return NextResponse.json({ error: "Lead already converted" }, { status: 400 });

    let user = lead.email ? await db.user.findUnique({ where: { email: lead.email } }) : null;

    const playerRole = await db.role.findFirst({ where: { name: "Player" } });
    const password = await hashPassword(lead.phone ?? "hxacademy123");

    if (!user) {
      const email = lead.email || `player-${Date.now()}@hxacademy.local`;
      user = await db.user.create({
        data: {
          name: lead.fullName,
          email,
          password,
          roleId: playerRole?.id ?? null,
          isActive: true,
        },
      });
    }

    const existingPlayer = await db.player.findUnique({ where: { userId: user.id } });
    if (existingPlayer) return NextResponse.json({ error: "Player record already exists for this user" }, { status: 400 });

    const player = await db.player.create({
      data: {
        userId: user.id,
        fullName: lead.fullName,
        phone: lead.phone ?? null,
        email: lead.email ?? null,
        dateOfBirth: lead.dateOfBirth,
        age: lead.age,
        parentName: lead.parentName ?? null,
        parentPhone: lead.parentPhone ?? null,
        address: lead.address ?? null,
        category: lead.categoryInterest ?? null,
        notes: lead.notes ?? null,
        status: "active",
      },
    });

    await db.lead.update({
      where: { id },
      data: { isConverted: true, convertedAt: new Date() },
    });

    const actor = session.user as { id: string; name?: string | null; role?: string };
    await logLeadActivity({
      leadId: id,
      actionType: "lead_converted",
      description: `Lead converted to player account (${user.email})`,
      performedById: session.user.id,
      performedByName: actor.name ?? "Admin",
      performedByRole: actor.role ?? "admin",
      metadata: { playerId: player.id, userId: user.id, email: user.email },
    });

    await logActivity({
      userId: session.user.id,
      action: "convert",
      module: "leads",
      description: `Converted lead ${lead.fullName} to player`,
      metadata: { leadId: id, playerId: player.id },
    });

    await createNotification({
      userId: user.id,
      playerId: player.id,
      title: "Welcome to Foot-Ball Skills Academy!",
      message: `Your account has been created. Your temporary password is your phone number.`,
      type: "success",
    });

    return NextResponse.json({ player, user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Conversion failed" }, { status: 500 });
  }
}
