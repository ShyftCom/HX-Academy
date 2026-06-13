import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logLeadActivity } from "@/lib/lead-activity";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: leadId } = await params;
  const notes = await db.leadNote.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: leadId } = await params;
  const body = await req.json();
  const { content } = body as { content: string };

  if (!content?.trim()) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const actor = session.user as { id: string; name?: string | null; role?: string };
  const note = await db.leadNote.create({
    data: {
      leadId,
      content: content.trim(),
      createdById: session.user.id,
      createdByName: actor.name ?? "Unknown",
      createdByRole: actor.role ?? "agent",
    },
  });

  await logLeadActivity({
    leadId,
    actionType: "note_added",
    description: `Note added: ${content.slice(0, 60)}${content.length > 60 ? "..." : ""}`,
    performedById: session.user.id,
    performedByName: actor.name ?? "Unknown",
    performedByRole: actor.role ?? "agent",
    metadata: { noteId: note.id, preview: content.slice(0, 100) },
  });

  return NextResponse.json(note, { status: 201 });
}
