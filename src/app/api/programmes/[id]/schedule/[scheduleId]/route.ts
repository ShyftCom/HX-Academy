import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

const EDITABLE_FIELDS = [
  "ageGroup", "minAge", "maxAge", "sessionName", "sessionType", "day", "startTime", "endTime",
  "venueId", "coachId", "capacity", "availableSpaces", "price", "registrationStatus", "isActive",
] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; scheduleId: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id: programmeId, scheduleId } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) if (body[key] !== undefined) data[key] = body[key];
    if (body.dobStart !== undefined) data.dobStart = body.dobStart ? new Date(body.dobStart) : null;
    if (body.dobEnd !== undefined) data.dobEnd = body.dobEnd ? new Date(body.dobEnd) : null;

    const row = await db.programmeSchedule.update({ where: { id: scheduleId, programmeId }, data, include: { venue: true, coach: true } });
    return NextResponse.json(row);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; scheduleId: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id: programmeId, scheduleId } = await params;
  try {
    await db.programmeSchedule.delete({ where: { id: scheduleId, programmeId } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
