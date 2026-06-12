import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const actionType = searchParams.get("actionType") ?? "";

  const where: Record<string, unknown> = { leadId: id };
  if (actionType && actionType !== "all") where.actionType = actionType;

  const [data, total] = await Promise.all([
    db.leadActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.leadActivity.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { actionType, description, metadata } = body;

  if (!actionType || !description) {
    return NextResponse.json({ error: "actionType and description are required" }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const actor = session.user as { id: string; name?: string | null; role?: string };

  const activity = await db.leadActivity.create({
    data: {
      leadId: id,
      actionType,
      description,
      performedById: session.user.id,
      performedByName: actor.name ?? "Admin",
      performedByRole: actor.role ?? "admin",
      metadata: metadata ?? null,
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
