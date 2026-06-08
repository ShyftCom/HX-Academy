import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      const existing = await db.user.findUnique({ where: { email: lead.email } });
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

        if (lead.selectedPlanId && player) {
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
      } else {
        user = existing;
        player = await db.player.findUnique({ where: { userId: existing.id } });
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
