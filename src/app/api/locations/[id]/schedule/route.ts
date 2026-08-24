import { NextRequest } from "next/server";
import { createSlot, listSlots } from "@/lib/schedule-api";

/** One location's schedule: `id` is the station id. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return listSlots(id);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return createSlot(await req.json(), id);
}
