import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const DEFAULT_SCHEDULE = {
  monday:    { available: true,  start: "09:00", end: "18:00" },
  tuesday:   { available: true,  start: "09:00", end: "18:00" },
  wednesday: { available: true,  start: "09:00", end: "18:00" },
  thursday:  { available: true,  start: "09:00", end: "18:00" },
  friday:    { available: true,  start: "09:00", end: "17:00" },
  saturday:  { available: false, start: null,    end: null    },
  sunday:    { available: false, start: null,    end: null    },
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = new URL(req.url).searchParams.get("agent_id") ?? session.user.id;

  let availability = await db.agentAvailability.findUnique({ where: { agentId } });

  if (!availability) {
    availability = await db.agentAvailability.create({
      data: {
        agentId,
        timezone: "Africa/Algiers",
        bufferMinutes: 15,
        weeklySchedule: DEFAULT_SCHEDULE,
      },
    });
  }

  return NextResponse.json(availability);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { timezone, bufferMinutes, weeklySchedule } = body as {
    timezone?: string;
    bufferMinutes?: number;
    weeklySchedule?: Prisma.InputJsonValue;
  };

  const availability = await db.agentAvailability.upsert({
    where: { agentId: session.user.id },
    create: {
      agentId: session.user.id,
      timezone: timezone ?? "Africa/Algiers",
      bufferMinutes: bufferMinutes ?? 15,
      weeklySchedule: (weeklySchedule ?? DEFAULT_SCHEDULE) as Prisma.InputJsonValue,
    },
    update: {
      ...(timezone !== undefined && { timezone }),
      ...(bufferMinutes !== undefined && { bufferMinutes }),
      ...(weeklySchedule !== undefined && { weeklySchedule }),
    },
  });

  return NextResponse.json(availability);
}
