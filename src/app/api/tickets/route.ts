import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).isPlayer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const assignedToId = searchParams.get("assignedToId") ?? "";
  const createdById = searchParams.get("createdById") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedToId) where.assignedToId = assignedToId;
  if (createdById) where.createdById = createdById;

  const [data, total] = await Promise.all([
    db.ticket.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.ticket.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).isPlayer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    if (!body.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!body.description?.trim()) return NextResponse.json({ error: "Description is required" }, { status: 400 });

    const ticket = await db.ticket.create({
      data: {
        title: body.title.trim(),
        description: body.description.trim(),
        status: "open",
        priority: body.priority ?? "medium",
        createdById: session.user.id,
        assignedToId: body.assignedToId ?? null,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify assignee
    if (body.assignedToId && body.assignedToId !== session.user.id) {
      await createNotification({
        userId: body.assignedToId,
        title: "New ticket assigned to you",
        message: `"${ticket.title}" — ${body.priority ?? "medium"} priority`,
        type: "info",
        link: `/dashboard/tickets/${ticket.id}`,
      });
    }

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
