import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LEAD_ASSIGNEE_ROLES } from "@/lib/lead-assignee-roles";

/** True for an active Admin or Super Admin — see lead-assignee-roles.ts. */
export async function isLeadAssignee(userId: string): Promise<boolean> {
  const user = await db.user.findFirst({
    where: { id: userId, isActive: true, role: { name: { in: [...LEAD_ASSIGNEE_ROLES] } } },
    select: { id: true },
  });
  return !!user;
}

/**
 * 400 when `assignedStaffId` names someone who may not own a lead. Absent,
 * null and empty (unassign) pass, and so does `currentId`, so a lead assigned
 * before this rule existed can still be saved without being reassigned.
 */
export async function rejectInvalidAssignee(
  assignedStaffId: unknown,
  currentId?: string | null,
): Promise<NextResponse | null> {
  if (assignedStaffId === undefined || assignedStaffId === null || assignedStaffId === "") return null;
  if (typeof assignedStaffId !== "string") return NextResponse.json({ error: "Invalid assignee", code: "invalid_assignee" }, { status: 400 });
  if (assignedStaffId === currentId) return null;
  if (await isLeadAssignee(assignedStaffId)) return null;
  return NextResponse.json({ error: "Leads can only be assigned to an active Admin or Super Admin", code: "invalid_assignee" }, { status: 400 });
}
