const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

interface DaySchedule {
  available: boolean;
  start: string | null;
  end: string | null;
}

interface WeeklySchedule {
  [day: string]: DaySchedule;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

export interface BlockedWindow {
  start: number;
  end: number;
}

export async function getBlockedWindows(
  agentId: string,
  date: string,
  bufferMinutes: number,
  db: import("@prisma/client").PrismaClient,
  excludeMeetingId?: string
): Promise<BlockedWindow[]> {
  const meetings = await db.meeting.findMany({
    where: { agentId, date, status: { not: "cancelled" }, ...(excludeMeetingId && { id: { not: excludeMeetingId } }) },
  });

  return meetings.map((m) => {
    const start = timeToMinutes(m.time);
    const end = start + m.durationMinutes + bufferMinutes;
    return { start, end };
  });
}

export function overlaps(
  startMin: number,
  endMin: number,
  blocked: BlockedWindow[]
): boolean {
  return blocked.some((b) => startMin < b.end && endMin > b.start);
}

export function isAgentAvailableSync(
  date: string,
  startTime: string,
  durationMinutes: number,
  weeklySchedule: WeeklySchedule,
  blocked: BlockedWindow[]
): boolean {
  const dayIndex = new Date(date).getDay();
  const dayName = DAY_NAMES[dayIndex];
  const day = weeklySchedule[dayName];
  if (!day?.available || !day.start || !day.end) return false;

  const dayStart = timeToMinutes(day.start);
  const dayEnd = timeToMinutes(day.end);
  const reqStart = timeToMinutes(startTime);
  const reqEnd = reqStart + durationMinutes;

  if (reqStart < dayStart || reqEnd > dayEnd) return false;
  return !overlaps(reqStart, reqEnd, blocked);
}

export function getAvailableSlots(
  date: string,
  durationMinutes: number,
  weeklySchedule: WeeklySchedule,
  blocked: BlockedWindow[],
  slotInterval = 30
): string[] {
  const dayIndex = new Date(date).getDay();
  const dayName = DAY_NAMES[dayIndex];
  const day = weeklySchedule[dayName];
  if (!day?.available || !day.start || !day.end) return [];

  const dayStart = timeToMinutes(day.start);
  const dayEnd = timeToMinutes(day.end);
  const slots: string[] = [];

  for (let t = dayStart; t + durationMinutes <= dayEnd; t += slotInterval) {
    if (!overlaps(t, t + durationMinutes, blocked)) {
      slots.push(minutesToTime(t));
    }
  }

  return slots;
}

export function findNextAvailableSlot(
  date: string,
  durationMinutes: number,
  weeklySchedule: WeeklySchedule,
  blocked: BlockedWindow[]
): string | null {
  const slots = getAvailableSlots(date, durationMinutes, weeklySchedule, blocked);
  return slots[0] ?? null;
}

export { timeToMinutes, minutesToTime, DAY_NAMES };
