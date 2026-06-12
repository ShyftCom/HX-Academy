import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { logLeadActivity } from "@/lib/lead-activity";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      status: true,
      assignedStaff: { select: { id: true, name: true, email: true } },
      surveyAnswers: { include: { question: true } },
    },
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

    // Fetch before state for audit log
    const before = await db.lead.findUnique({
      where: { id },
      include: { status: true, assignedStaff: { select: { id: true, name: true } } },
    });
    if (!before) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

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
      include: { status: true, assignedStaff: { select: { id: true, name: true } } },
    });

    const actor = session.user as { id: string; name?: string | null; role?: string };
    const performedByName = actor.name ?? "Admin";
    const performedByRole = actor.role ?? "admin";
    const logBase = { leadId: id, performedById: session.user.id, performedByName, performedByRole };

    // Log status change
    if (body.statusId && body.statusId !== before.statusId) {
      const fromStatus = before.status;
      const toStatus = lead.status;
      await logLeadActivity({
        ...logBase,
        actionType: "status_change",
        description: `Status changed from ${fromStatus?.name ?? "None"} → ${toStatus?.name ?? "None"}`,
        metadata: { from: fromStatus?.name, to: toStatus?.name, fromId: fromStatus?.id, toId: toStatus?.id },
      });
    }

    // Log assignment changes
    if (body.assignedStaffId !== undefined && body.assignedStaffId !== before.assignedStaffId) {
      if (!before.assignedStaffId && lead.assignedStaff) {
        await logLeadActivity({
          ...logBase,
          actionType: "lead_assigned",
          description: `Lead assigned to ${lead.assignedStaff.name}`,
          metadata: { assignedToId: lead.assignedStaff.id, assignedToName: lead.assignedStaff.name },
        });
      } else if (before.assignedStaffId && !body.assignedStaffId) {
        await logLeadActivity({
          ...logBase,
          actionType: "lead_reassigned",
          description: `Lead unassigned from ${before.assignedStaff?.name ?? "unknown"}`,
          metadata: { fromId: before.assignedStaffId, fromName: before.assignedStaff?.name },
        });
      } else if (before.assignedStaff && lead.assignedStaff) {
        await logLeadActivity({
          ...logBase,
          actionType: "lead_reassigned",
          description: `Lead reassigned from ${before.assignedStaff.name} to ${lead.assignedStaff.name}`,
          metadata: {
            fromId: before.assignedStaff.id,
            fromName: before.assignedStaff.name,
            toId: lead.assignedStaff.id,
            toName: lead.assignedStaff.name,
          },
        });
      }
    }

    // Log key field edits
    const fieldMap: Record<string, string> = {
      fullName: "Full Name", phone: "Phone", email: "Email", address: "Address",
      categoryInterest: "Category", source: "Source", notes: "Notes",
    };
    for (const [field, label] of Object.entries(fieldMap)) {
      const oldVal = String((before as Record<string, unknown>)[field] ?? "");
      const newVal = String((body as Record<string, unknown>)[field] ?? "");
      if (newVal !== oldVal && (newVal || oldVal)) {
        await logLeadActivity({
          ...logBase,
          actionType: "field_edited",
          description: `Field updated: ${label} changed from "${oldVal || "—"}" → "${newVal || "—"}"`,
          metadata: { field, from: oldVal, to: newVal },
        });
      }
    }

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

    const actor = session.user as { id: string; name?: string | null; role?: string };
    await logLeadActivity({
      leadId: id,
      actionType: "lead_archived",
      description: `Lead archived by ${actor.name ?? "Admin"}`,
      performedById: session.user.id,
      performedByName: actor.name ?? "Admin",
      performedByRole: actor.role ?? "admin",
    });

    await db.lead.delete({ where: { id } });
    await logActivity({ userId: session.user.id, action: "delete", module: "leads", description: `Deleted lead: ${lead.fullName}` });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
