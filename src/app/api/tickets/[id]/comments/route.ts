import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/activity";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).isPlayer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: ticketId } = await params;
  try {
    const body = await req.json();
    if (!body.body?.trim()) return NextResponse.json({ error: "Comment body is required" }, { status: 400 });

    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, title: true, createdById: true, assignedToId: true },
    });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const comment = await db.ticketComment.create({
      data: {
        ticketId,
        authorId: session.user.id,
        body: body.body.trim(),
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    // Update ticket updatedAt
    await db.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });

    // Notify parties involved (not the commenter)
    const notify = new Set<string>();
    if (ticket.createdById !== session.user.id) notify.add(ticket.createdById);
    if (ticket.assignedToId && ticket.assignedToId !== session.user.id) notify.add(ticket.assignedToId);

    for (const userId of notify) {
      await createNotification({
        userId,
        title: "New reply on ticket",
        message: `"${ticket.title}" — new comment added`,
        type: "info",
        link: `/dashboard/tickets/${ticketId}`,
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
