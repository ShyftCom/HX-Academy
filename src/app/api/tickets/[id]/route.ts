import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/activity";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).isPlayer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).isPlayer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const body = await req.json();
    const prevTicket = await db.ticket.findUnique({ where: { id }, select: { assignedToId: true, title: true } });

    const updated = await db.ticket.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId || null }),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify new assignee if changed
    if (body.assignedToId && body.assignedToId !== prevTicket?.assignedToId && body.assignedToId !== session.user.id) {
      await createNotification({
        userId: body.assignedToId,
        title: "Ticket assigned to you",
        message: `"${prevTicket?.title}" has been assigned to you`,
        type: "info",
        link: `/dashboard/tickets/${id}`,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).isPlayer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    await db.ticket.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
