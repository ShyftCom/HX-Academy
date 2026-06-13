import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBlockedWindows, isAgentAvailableSync } from "@/lib/calendar";
import { sendEmail, buildBookingConfirmationEmail } from "@/lib/email";
import { logLeadActivity } from "@/lib/lead-activity";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");
  const leadId = searchParams.get("lead_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (agentId) where.agentId = agentId;
  if (leadId) where.leadId = leadId;
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, string>).gte = from;
    if (to) (where.date as Record<string, string>).lte = to;
  }

  const meetings = await db.meeting.findMany({
    where,
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: {
      lead: { select: { id: true, fullName: true } },
      agent: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(meetings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leadId, agentId, date, time, durationMinutes = 30, type = "call", notes } = body as {
    leadId: string;
    agentId: string;
    date: string;
    time: string;
    durationMinutes?: number;
    type?: string;
    notes?: string;
  };

  if (!leadId || !agentId || !date || !time) {
    return NextResponse.json({ error: "leadId, agentId, date, time are required" }, { status: 400 });
  }

  const [lead, agent, availability] = await Promise.all([
    db.lead.findUnique({ where: { id: leadId }, select: { id: true, fullName: true } }),
    db.user.findUnique({ where: { id: agentId }, select: { id: true, name: true, email: true } }),
    db.agentAvailability.findUnique({ where: { agentId } }),
  ]);

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const weeklySchedule = (availability?.weeklySchedule ?? {}) as Record<string, { available: boolean; start: string | null; end: string | null }>;
  const bufferMinutes = availability?.bufferMinutes ?? 15;
  const blocked = await getBlockedWindows(agentId, date, bufferMinutes, db as never);
  const isAvailable = isAgentAvailableSync(date, time, durationMinutes, weeklySchedule, blocked);

  if (!isAvailable && availability) {
    return NextResponse.json({ error: "Agent is not available at this time" }, { status: 409 });
  }

  const actor = session.user as { id: string; name?: string | null };

  const [meeting] = await db.$transaction([
    db.meeting.create({
      data: {
        leadId,
        agentId,
        leadName: lead.fullName,
        agentName: agent.name ?? "Agent",
        date,
        time,
        durationMinutes,
        type,
        notes,
        status: "scheduled",
        createdById: session.user.id,
        createdByName: actor.name ?? "System",
      },
    }),
    db.lead.update({
      where: { id: leadId },
      data: {},
    }),
  ]);

  // Update lead status to "Meeting booked" if a status with that name exists
  const meetingStatus = await db.leadStatus.findFirst({ where: { name: { contains: "Meeting", mode: "insensitive" } } });
  if (meetingStatus) {
    const currentLead = await db.lead.findUnique({ where: { id: leadId }, select: { statusId: true } });
    if (currentLead?.statusId !== meetingStatus.id) {
      await db.lead.update({ where: { id: leadId }, data: { statusId: meetingStatus.id } });
    }
  }

  await logLeadActivity({
    leadId,
    actionType: "meeting_booked",
    description: `Meeting scheduled with ${agent.name} on ${date} at ${time} (${durationMinutes} min)`,
    performedById: session.user.id,
    performedByName: actor.name ?? "System",
    performedByRole: (session.user as { role?: string }).role ?? "admin",
    metadata: { meetingId: meeting.id, date, time, durationMinutes, agentName: agent.name },
  });

  // In-app notification to agent if they didn't book it themselves
  if (agentId !== session.user.id) {
    await db.notification.create({
      data: {
        userId: agentId,
        type: "meeting_booked",
        title: "New meeting scheduled",
        message: `You have a call with ${lead.fullName} on ${date} at ${time} (${durationMinutes} min)`,
        link: `/dashboard/leads/${leadId}`,
      },
    });
  }

  // Email confirmation (non-blocking)
  if (agent.email) {
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const { subject, text } = buildBookingConfirmationEmail({
      agentName: agent.name ?? "Agent",
      leadName: lead.fullName,
      date,
      time,
      duration: durationMinutes,
      type,
      bookedByName: actor.name ?? "System",
      leadId,
      baseUrl,
    });
    sendEmail(agent.email, subject, text).catch(console.error);
  }

  return NextResponse.json(meeting, { status: 201 });
}
