import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity, createNotification } from "@/lib/activity";
import { logLeadActivity } from "@/lib/lead-activity";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const lead = await db.lead.findUnique({ where: { id }, include: { status: true } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (lead.isConverted) return NextResponse.json({ error: "Lead already converted" }, { status: 400 });

    const actor = session.user as { id: string; name?: string | null; role?: string };

    // ── Summer Camp conversion ──
    if (lead.leadType === "summer_camp") {
      const body = await req.json().catch(() => ({}));
      const { sessionId, paymentStatus, paidAmount } = body as { sessionId?: string; paymentStatus?: string; paidAmount?: number };

      // Parse camp-specific data stored on the lead
      let campData: { sessionId?: string; gender?: string; healthNotes?: string; guardianRelation?: string } = {};
      try { campData = JSON.parse(lead.summerCampData ?? "{}"); } catch {}

      const player = await db.summerCampPlayer.create({
        data: {
          leadId: lead.id,
          fullName: lead.fullName,
          dateOfBirth: lead.dateOfBirth,
          age: lead.age,
          gender: campData.gender ?? null,
          healthNotes: campData.healthNotes ?? null,
          guardianName: lead.parentName ?? null,
          guardianPhone: lead.parentPhone ?? null,
          guardianRelation: campData.guardianRelation ?? null,
          sessionId: sessionId ?? campData.sessionId ?? null,
          stationId: lead.stationId ?? null,
          paymentStatus: paymentStatus ?? "unpaid",
          paidAmount: paidAmount ? Number(paidAmount) : null,
          status: "active",
        },
      });

      // Move any application files to summer camp documents
      const appFiles = await db.applicationFile.findMany({ where: { leadId: lead.id } });
      if (appFiles.length > 0) {
        await db.summerCampDocument.createMany({
          data: appFiles.map((f) => ({
            playerId: player.id,
            requirementId: f.requirementId ?? null,
            fileName: f.fileName,
            fileUrl: f.fileUrl,
            mimeType: f.mimeType ?? null,
            size: f.size ?? null,
          })),
        });
      }

      await db.lead.update({ where: { id }, data: { isConverted: true, convertedAt: new Date() } });

      await logLeadActivity({
        leadId: id,
        actionType: "lead_converted",
        description: `Summer Camp lead converted to participant (${player.fullName})`,
        performedById: session.user.id,
        performedByName: actor.name ?? "Admin",
        performedByRole: actor.role ?? "admin",
        metadata: { summerCampPlayerId: player.id },
      });

      await logActivity({
        userId: session.user.id,
        action: "convert",
        module: "leads",
        description: `Converted summer camp lead ${lead.fullName} to participant`,
        metadata: { leadId: id, summerCampPlayerId: player.id },
      });

      return NextResponse.json({ summerCampPlayer: player }, { status: 201 });
    }

    // ── Academy conversion (original flow) ──
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

    const refMatch = lead.notes?.match(/__ref:([A-Z0-9]+)__/);
    const refCode = refMatch?.[1] ?? null;
    const cleanNotes = lead.notes?.replace(/__ref:[A-Z0-9]+__/, "").trim() || null;

    const affiliate = refCode
      ? await db.affiliate.findUnique({ where: { code: refCode } })
      : null;

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
        notes: cleanNotes,
        status: "active",
        referralCode: refCode,
        stationId: lead.stationId ?? null,
      },
    });

    if (affiliate) {
      await db.affiliateReferral.create({
        data: {
          affiliateId: affiliate.id,
          playerId: player.id,
          stationId: affiliate.stationId ?? null,
          registrationDate: new Date(),
          paymentStatus: "unpaid",
        },
      });
    }

    await db.lead.update({ where: { id }, data: { isConverted: true, convertedAt: new Date() } });

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
      title: "Welcome to HX Academy!",
      message: `Your account has been created. Your temporary password is your phone number.`,
      type: "success",
    });

    return NextResponse.json({ player, user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Conversion failed" }, { status: 500 });
  }
}
