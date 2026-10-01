import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Approving creates a login (with a password the caller may choose) and a
  // subscription. On auth() alone, any signed-in player could mint accounts.
  const denied = await requirePermissionResponse(PERMISSIONS.APPLICATIONS_MANAGE);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { createAccount = true, password, subscriptionStart, subscriptionEnd } = body;

    const lead = await db.lead.findUnique({ where: { id }, include: { selectedPlan: true } });
    if (!lead) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    let user = null;
    let player = null;

    if (createAccount && lead.email) {
      const existing = await db.user.findUnique({ where: { email: lead.email }, include: { role: true } });
      if (existing?.role && existing.role.name !== "Player") {
        return NextResponse.json({ error: "That email already belongs to a staff account" }, { status: 400 });
      }

      if (!existing) {
        const hashedPw = await bcrypt.hash(password || uuid(), 12);
        user = await db.user.create({
          data: {
            email: lead.email,
            name: lead.fullName,
            password: hashedPw,
            isActive: true,
          },
        });
      } else {
        // A parent's login already exists — this is a sibling. The child gets
        // their own player record on that login; the password is untouched.
        user = existing;
      }

      // Re-approving the same child must not create them twice.
      player = await db.player.findFirst({
        where: { userId: user.id, fullName: { equals: lead.fullName, mode: "insensitive" } },
      });

      if (!player) {
        player = await db.player.create({
          data: {
            userId: user.id,
            fullName: lead.fullName,
            email: lead.email ?? null,
            phone: lead.phone ?? null,
            dateOfBirth: lead.dateOfBirth ?? null,
            age: lead.age ?? null,
            parentName: lead.parentName ?? null,
            parentPhone: lead.parentPhone ?? null,
            address: lead.address ?? null,
            category: lead.categoryInterest ?? null,
            status: "active",
          },
        });

        if (lead.selectedPlanId) {
          await db.subscription.create({
            data: {
              playerId: player.id,
              planId: lead.selectedPlanId,
              status: "active",
              startDate: subscriptionStart ? new Date(subscriptionStart) : new Date(),
              endDate: subscriptionEnd ? new Date(subscriptionEnd) : null,
            },
          });
        }
      }
    }

    const approvedStatus = await db.leadStatus.findFirst({
      where: { name: { equals: "Approved", mode: "insensitive" } },
    });

    await db.lead.update({
      where: { id },
      data: {
        isConverted: true,
        convertedAt: new Date(),
        ...(approvedStatus && { statusId: approvedStatus.id }),
      },
    });

    await logActivity({
      userId: session.user.id,
      action: "approve",
      module: "applications",
      description: `Approved application: ${lead.fullName}`,
      metadata: { leadId: id, userId: user?.id, playerId: player?.id },
    });

    return NextResponse.json({ success: true, userId: user?.id, playerId: player?.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
