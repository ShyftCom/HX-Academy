import { NextRequest } from "next/server";
import { deleteSlot, updateSlot } from "@/lib/schedule-api";

// The slot is authorized by its own stationId, so a mismatched [id] in the path
// cannot be used to reach a slot in another location.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await params;
  return updateSlot(await req.json(), slotId);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await params;
  return deleteSlot(slotId);
}
