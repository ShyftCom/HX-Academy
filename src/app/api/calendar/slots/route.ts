import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBlockedWindows, getAvailableSlots, findNextAvailableSlot } from "@/lib/calendar";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");
  const date = searchParams.get("date");
  const duration = parseInt(searchParams.get("duration") ?? "30");

  if (!agentId || !date) return NextResponse.json({ error: "agent_id and date are required" }, { status: 400 });

  const availability = await db.agentAvailability.findUnique({ where: { agentId } });
  const weeklySchedule = (availability?.weeklySchedule ?? {}) as Record<string, { available: boolean; start: string | null; end: string | null }>;
  const bufferMinutes = availability?.bufferMinutes ?? 15;

  const blocked = await getBlockedWindows(agentId, date, bufferMinutes, db as never);
  const slots = getAvailableSlots(date, duration, weeklySchedule, blocked);
  const nextAvailable = findNextAvailableSlot(date, duration, weeklySchedule, blocked);

  return NextResponse.json({ slots, next_available_slot: nextAvailable });
}
