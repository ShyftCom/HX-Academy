import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity, createNotification } from "@/lib/activity";
import { logLeadActivity } from "@/lib/lead-activity";
import { generatePassword } from "@/lib/generate-password";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  const { id } = await params;

  // Read once: the summer-camp branch below reads its own fields off the same body.
  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string; paymentStatus?: string; paidAmount?: number;
    email?: string; password?: string;
  };

  try {
    const lead = await db.lead.findUnique({ where: { id }, include: { status: true } });
    if (!lead) return NextResponse.json({ error: "Lead not found", code: "lead_not_found" }, { status: 404 });
    if (lead.isConverted) return NextResponse.json({ error: "Lead already converted", code: "lead_already_converted" }, { status: 400 });

    const actor = session.user as { id: string; name?: string | null; role?: string };

    // ── Summer Camp conversion ──
    if (lead.leadType === "summer_camp") {
      const { sessionId, paymentStatus, paidAmount } = body;

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

    // ── Academy conversion: close the lead by opening the player's account ──
    //
    // The credentials are set here, by the admin closing the lead, and handed
    // back once in the response so they can be passed on to the player. They
    // used to be silently derived from the lead's phone number, which meant
    // nobody could tell the player what their password was — and anyone who
    // knew the phone number could log in as them.
    const email = (body.email ?? lead.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "An email address is required to create the player's account", code: "email_required" }, { status: 400 });
    }

    const playerRole = await db.role.findFirst({ where: { name: "Player" } });

    let user = await db.user.findUnique({ where: { email }, include: { players: { select: { id: true, fullName: true } }, role: true } });

    // A staff or admin login must not be quietly repurposed — and its
    // password certainly must not be reset by converting a lead.
    if (user?.role && user.role.name !== "Player") {
      return NextResponse.json({ error: "That email already belongs to a staff account", code: "email_taken_staff" }, { status: 400 });
    }

    // Siblings share their parent's login: when the email already has
    // children on it, this child is added alongside them. The family already
    // has a password, so it is left as is — resetting it here would lock the
    // parent out of the account they are already using for the other child.
    const joiningFamily = !!user && user.players.length > 0;
    if (joiningFamily && user!.players.some((p) => p.fullName.trim().toLowerCase() === lead.fullName.trim().toLowerCase())) {
      return NextResponse.json({ error: "This player already exists on that account", code: "player_already_on_account" }, { status: 400 });
    }

    let plainPassword: string | null = null;
    if (!joiningFamily) {
      plainPassword = body.password?.trim() || generatePassword();
      if (plainPassword.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters", code: "password_too_short" }, { status: 400 });
      }
    }

    if (user && joiningFamily) {
      // Nothing to change on the login itself.
    } else if (user) {
      user = await db.user.update({
        where: { id: user.id },
        data: { name: lead.fullName, password: await hashPassword(plainPassword!), roleId: playerRole?.id ?? user.roleId, isActive: true },
        include: { players: { select: { id: true, fullName: true } }, role: true },
      });
    } else {
      user = await db.user.create({
        data: {
          name: lead.fullName,
          email,
          password: await hashPassword(plainPassword!),
          roleId: playerRole?.id ?? null,
          isActive: true,
        },
        include: { players: { select: { id: true, fullName: true } }, role: true },
      });
    }

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
        email,
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

    await db.lead.update({ where: { id }, data: { isConverted: true, convertedAt: new Date(), email } });

    await logLeadActivity({
      leadId: id,
      actionType: "lead_converted",
      description: joiningFamily ? `Lead converted and added to existing family account (${user.email})` : `Lead converted to player account (${user.email})`,
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
      message: "Your account is ready. Next: choose your plan, pay, then upload your documents.",
      type: "success",
    });

    // The plaintext password is returned exactly once, to the admin who just
    // set it, so they can pass it to the player. It is never stored or logged.
    // A child added to an existing family account gets no password back: the
    // family signs in with the one they already have.
    return NextResponse.json(
      {
        player,
        user: { id: user.id, email: user.email },
        credentials: { email, password: plainPassword },
        joinedExistingAccount: joiningFamily,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Conversion failed", code: "conversion_failed" }, { status: 500 });
  }
}
