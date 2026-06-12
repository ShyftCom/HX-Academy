import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logLeadActivity } from "@/lib/lead-activity";
import { logActivity } from "@/lib/activity";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status_id } = body as { status_id: string };

  if (!status_id) return NextResponse.json({ error: "status_id is required" }, { status: 400 });

  try {
    const [lead, toStatus] = await Promise.all([
      db.lead.findUnique({ where: { id }, include: { status: true } }),
      db.leadStatus.findUnique({ where: { id: status_id } }),
    ]);

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!toStatus) return NextResponse.json({ error: "Status not found" }, { status: 404 });
    if (lead.statusId === status_id) return NextResponse.json({ lead_id: id, status_id, updated_at: lead.updatedAt });

    const fromStatus = lead.status;
    const actor = session.user as { id: string; name?: string | null; role?: string };

    // Atomic: update lead + insert activity log in one transaction
    const [updatedLead] = await db.$transaction([
      db.lead.update({
        where: { id },
        data: { statusId: status_id },
        select: { id: true, statusId: true, updatedAt: true },
      }),
      db.leadActivity.create({
        data: {
          leadId: id,
          actionType: "status_change",
          description: `Status changed from ${fromStatus?.name ?? "None"} → ${toStatus.name}`,
          performedById: session.user.id,
          performedByName: actor.name ?? "Admin",
          performedByRole: actor.role ?? "admin",
          metadata: {
            from_status_id: fromStatus?.id ?? null,
            from_status_label: fromStatus?.name ?? null,
            to_status_id: toStatus.id,
            to_status_label: toStatus.name,
          },
        },
      }),
    ]);

    await logActivity({
      userId: session.user.id,
      action: "status_change",
      module: "leads",
      description: `Changed lead ${lead.fullName} status: ${fromStatus?.name ?? "None"} → ${toStatus.name}`,
      metadata: { leadId: id, from: fromStatus?.name, to: toStatus.name },
    });

    return NextResponse.json({ lead_id: updatedLead.id, status_id: updatedLead.statusId, updated_at: updatedLead.updatedAt });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Status update failed" }, { status: 500 });
  }
}
