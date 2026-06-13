import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBlockedWindows, isAgentAvailableSync } from "@/lib/calendar";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const time = searchParams.get("time");
  const duration = parseInt(searchParams.get("duration") ?? "30");

  if (!date || !time) return NextResponse.json({ error: "date and time are required" }, { status: 400 });

  const agents = await db.user.findMany({
    where: { isActive: true, role: { name: { in: ["admin", "agent"] } } },
    select: { id: true, name: true, image: true, agentAvailability: true },
  });

  const available = await Promise.all(
    agents.map(async (agent) => {
      const avail = agent.agentAvailability;
      if (!avail) return null;
      const weeklySchedule = avail.weeklySchedule as Record<string, { available: boolean; start: string | null; end: string | null }>;
      const blocked = await getBlockedWindows(agent.id, date, avail.bufferMinutes, db as never);
      const free = isAgentAvailableSync(date, time, duration, weeklySchedule, blocked);
      if (!free) return null;
      return { agent_id: agent.id, name: agent.name, avatar: agent.image };
    })
  );

  return NextResponse.json(available.filter(Boolean));
}
