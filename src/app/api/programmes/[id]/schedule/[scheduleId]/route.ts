import { NextRequest } from "next/server";
import { deleteSlot, updateSlot } from "@/lib/schedule-api";

// Delegates to the location-scoped handlers: the slot's own stationId decides
// who may touch it, not the programme in the path.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = await params;
  return updateSlot(await req.json(), scheduleId);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = await params;
  return deleteSlot(scheduleId);
}
