import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: { status: true, assignedStaff: { select: { id: true, name: true, email: true } }, surveyAnswers: { include: { question: true } } },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const lead = await db.lead.update({
      where: { id },
      data: {
        fullName: body.fullName,
        phone: body.phone ?? null,
        email: body.email || null,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        age: body.dateOfBirth ? Math.floor((Date.now() - new Date(body.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365)) : null,
        parentName: body.parentName ?? null,
        parentPhone: body.parentPhone ?? null,
        address: body.address ?? null,
        categoryInterest: body.categoryInterest ?? null,
        notes: body.notes ?? null,
        source: body.source ?? null,
        statusId: body.statusId ?? null,
        assignedStaffId: body.assignedStaffId ?? null,
      },
      include: { status: true },
    });
    await logActivity({ userId: session.user.id, action: "update", module: "leads", description: `Updated lead: ${lead.fullName}` });
    return NextResponse.json(lead);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    await db.lead.delete({ where: { id } });
    await logActivity({ userId: session.user.id, action: "delete", module: "leads", description: `Deleted lead: ${lead.fullName}` });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
