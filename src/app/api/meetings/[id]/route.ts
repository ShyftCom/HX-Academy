import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logLeadActivity } from "@/lib/lead-activity";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const meeting = await db.meeting.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, fullName: true } },
      agent: { select: { id: true, name: true, image: true, email: true } },
    },
  });

  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(meeting);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { date, time, durationMinutes, type, notes, status } = body as {
    date?: string;
    time?: string;
    durationMinutes?: number;
    type?: string;
    notes?: string;
    status?: string;
  };

  const existing = await db.meeting.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const meeting = await db.meeting.update({
    where: { id },
    data: {
      ...(date !== undefined && { date }),
      ...(time !== undefined && { time }),
      ...(durationMinutes !== undefined && { durationMinutes }),
      ...(type !== undefined && { type }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
    },
  });

  const actor = session.user as { id: string; name?: string | null; role?: string };
  const actionType = status === "cancelled" ? "meeting_cancelled" : "meeting_updated";
  await logLeadActivity({
    leadId: existing.leadId,
    actionType,
    description: status === "cancelled"
      ? `Meeting on ${existing.date} at ${existing.time} cancelled`
      : `Meeting updated: ${date ?? existing.date} at ${time ?? existing.time}`,
    performedById: session.user.id,
    performedByName: actor.name ?? "System",
    performedByRole: actor.role ?? "admin",
    metadata: { meetingId: id },
  });

  return NextResponse.json(meeting);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.meeting.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.meeting.delete({ where: { id } });

  const actor = session.user as { id: string; name?: string | null; role?: string };
  await logLeadActivity({
    leadId: existing.leadId,
    actionType: "meeting_cancelled",
    description: `Meeting on ${existing.date} at ${existing.time} deleted`,
    performedById: session.user.id,
    performedByName: actor.name ?? "System",
    performedByRole: actor.role ?? "admin",
  });

  return NextResponse.json({ ok: true });
}
