import { NextRequest, NextResponse } from "next/server";
import { createSlot } from "@/lib/schedule-api";

/**
 * Kept for the Schedule tab inside the programme editor. Schedules are now owned
 * by a location, so the body must name one; authorization and conflict checking
 * happen against that location, exactly as on /api/locations/[id]/schedule.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: programmeId } = await params;
  const body = await req.json();
  if (!body?.stationId) return NextResponse.json({ error: "stationId is required" }, { status: 400 });
  return createSlot({ ...body, programmeId }, body.stationId);
}
