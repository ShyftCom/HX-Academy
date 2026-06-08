import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      status: true,
      selectedPlan: true,
      surveyAnswers: { include: { question: true }, orderBy: { createdAt: "asc" } },
      applicationFiles: { include: { requirement: true }, orderBy: { createdAt: "asc" } },
      assignedStaff: { select: { id: true, name: true } },
    },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await db.lead.update({
      where: { id },
      data: {
        ...(body.statusId !== undefined && { statusId: body.statusId }),
        ...(body.adminNotes !== undefined && { adminNotes: body.adminNotes }),
        ...(body.assignedStaffId !== undefined && { assignedStaffId: body.assignedStaffId }),
      },
      include: { status: true, selectedPlan: true },
    });

    await logActivity({
      userId: session.user.id,
      action: "update",
      module: "applications",
      description: `Updated application: ${updated.fullName}`,
      metadata: { leadId: id },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
