import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id: programmeId } = await params;
  try {
    const body = await req.json();
    if (!body.ageGroup) return NextResponse.json({ error: "ageGroup is required" }, { status: 400 });

    const count = await db.programmeSchedule.count({ where: { programmeId } });
    const row = await db.programmeSchedule.create({
      data: {
        programmeId,
        ageGroup: body.ageGroup,
        minAge: body.minAge ?? null,
        maxAge: body.maxAge ?? null,
        dobStart: body.dobStart ? new Date(body.dobStart) : null,
        dobEnd: body.dobEnd ? new Date(body.dobEnd) : null,
        sessionName: body.sessionName ?? null,
        sessionType: body.sessionType ?? null,
        day: body.day ?? null,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        venueId: body.venueId ?? null,
        coachId: body.coachId ?? null,
        capacity: body.capacity ?? null,
        availableSpaces: body.availableSpaces ?? null,
        price: body.price ?? null,
        registrationStatus: body.registrationStatus ?? "open",
        order: count,
      },
      include: { venue: true, coach: true },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
