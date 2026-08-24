import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Shared vocabulary for location-scoped schedules.
 *
 * A slot carries its day and times twice: once as the free-text strings the
 * public table and the admin inputs have always rendered (`day`, `startTime`,
 * `endTime`), and once as typed mirrors (`dayOfWeek`, `startMinutes`,
 * `endMinutes`) that the (stationId, dayOfWeek) index and the overlap
 * constraint can actually use.
 *
 * Everything that writes a slot goes through `slotWriteData()` so the two
 * halves are derived from one source and can never drift apart.
 */

/** 0 = Sunday … 6 = Saturday, matching JS `Date#getDay`. */
export const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/**
 * Aliases accepted when reading the legacy free-text `day` column, in the three
 * languages the platform has ever written it in. Anything else — including the
 * seed's "Monday-Friday", which names a range rather than a day — yields null:
 * the slot is then excluded from the overlap constraint and flagged in the
 * admin rather than being silently pinned to a guessed weekday.
 */
const DAY_ALIASES: Record<string, number> = {
  sunday: 0, dimanche: 0, "الأحد": 0,
  monday: 1, lundi: 1, "الإثنين": 1, "الاثنين": 1,
  tuesday: 2, mardi: 2, "الثلاثاء": 2,
  wednesday: 3, mercredi: 3, "الأربعاء": 3,
  thursday: 4, jeudi: 4, "الخميس": 4,
  friday: 5, vendredi: 5, "الجمعة": 5,
  saturday: 6, samedi: 6, "السبت": 6,
};

export function parseDayOfWeek(day: string | null | undefined): number | null {
  if (!day) return null;
  const key = day.trim().toLowerCase();
  return key in DAY_ALIASES ? DAY_ALIASES[key] : null;
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** "17:30" → 1050. Anything not a 24-hour HH:MM → null. */
export function parseMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = TIME_RE.exec(time.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** 1050 → "17:30". */
export function minutesToTime(minutes: number | null | undefined): string | null {
  if (minutes == null) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

const optionalInt = z.number().int().nullable().optional();

/**
 * `day` accepts either a DayKey (what the new admin select sends) or free text
 * (what already sits in the column, and what the programme editor still allows).
 */
export const slotInputSchema = z.object({
  ageGroup: z.string().min(1, "ageGroup is required"),
  minAge: optionalInt,
  maxAge: optionalInt,
  dobStart: z.string().nullable().optional(),
  dobEnd: z.string().nullable().optional(),
  sessionName: z.string().nullable().optional(),
  sessionType: z.string().nullable().optional(),
  day: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  field: z.string().nullable().optional(),
  programmeId: z.string().nullable().optional(),
  coachId: z.string().nullable().optional(),
  capacity: optionalInt,
  availableSpaces: optionalInt,
  price: z.number().nullable().optional(),
  registrationStatus: z.enum(["open", "waitlist", "full", "closed"]).optional(),
  isActive: z.boolean().optional(),
});

export type SlotInput = z.infer<typeof slotInputSchema>;

/**
 * A partial update: every field optional, but each present one still validated.
 *
 * `stationId` is update-only — moving a slot to another location. On create the
 * location comes from the route, never the body. The caller must hold access to
 * both the old and the new location; see updateSlot in schedule-api.ts.
 */
export const slotUpdateSchema = slotInputSchema.partial().extend({ stationId: z.string().optional() });

/**
 * Turn validated input into the Prisma payload, deriving the typed mirrors.
 * Only keys actually present in `input` are emitted, so this serves both create
 * (with `ageGroup` guaranteed) and partial update.
 */
export function slotWriteData(input: Partial<SlotInput> & { stationId?: string }): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const copy = ["ageGroup", "minAge", "maxAge", "sessionName", "sessionType", "programmeId", "coachId", "capacity", "availableSpaces", "price", "registrationStatus", "isActive"] as const;
  for (const key of copy) if (input[key] !== undefined) data[key] = input[key];
  // Only ever set on update. createSlot appends the route's stationId after this,
  // so a create body can never redirect a slot to another location.
  if (input.stationId !== undefined) data.stationId = input.stationId;

  if (input.dobStart !== undefined) data.dobStart = input.dobStart ? new Date(input.dobStart) : null;
  if (input.dobEnd !== undefined) data.dobEnd = input.dobEnd ? new Date(input.dobEnd) : null;
  // `field` is NOT NULL with an empty-string default: "" means "no pitch named",
  // which is what makes the overlap constraint comparable with `=`.
  if (input.field !== undefined) data.field = (input.field ?? "").trim();

  if (input.day !== undefined) {
    data.day = input.day || null;
    data.dayOfWeek = parseDayOfWeek(input.day);
  }
  if (input.startTime !== undefined) {
    data.startTime = input.startTime || null;
    data.startMinutes = parseMinutes(input.startTime);
  }
  if (input.endTime !== undefined) {
    data.endTime = input.endTime || null;
    data.endMinutes = parseMinutes(input.endTime);
  }
  return data;
}

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * The slot this one would collide with, or null.
 *
 * The database is the actual guarantee — `programme_schedules_no_overlap` is an
 * EXCLUDE constraint and cannot be raced. This lookup exists so the API can say
 * *which* session is in the way instead of surfacing a Postgres error, and so
 * it must apply exactly the same predicate the constraint does.
 */
export async function findOverlappingSlot(
  db: Db,
  slot: { stationId: string; field: string; dayOfWeek: number | null; startMinutes: number | null; endMinutes: number | null; isActive: boolean },
  excludeId?: string,
) {
  if (!slot.isActive || !slot.field || slot.dayOfWeek == null || slot.startMinutes == null || slot.endMinutes == null) return null;
  return db.scheduleSlot.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      stationId: slot.stationId,
      field: slot.field,
      dayOfWeek: slot.dayOfWeek,
      isActive: true,
      startMinutes: { lt: slot.endMinutes },
      endMinutes: { gt: slot.startMinutes },
    },
    select: { id: true, ageGroup: true, sessionName: true, day: true, startTime: true, endTime: true, field: true },
  });
}

/** Postgres 23P01 — exclusion_violation, raised by the constraint or its trigger fallback. */
export function isOverlapError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const meta = (error as { meta?: { code?: string } })?.meta?.code;
  // Prisma surfaces a raw driver error as P2010 with the driver code in `meta`,
  // and an unrecognised constraint failure as P2034/P2002-adjacent codes; check both.
  return code === "23P01" || meta === "23P01" || String((error as Error)?.message ?? "").includes("programme_schedules_no_overlap");
}

/** Postgres 23514 — the endMinutes > startMinutes check. */
export function isTimeOrderError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const meta = (error as { meta?: { code?: string } })?.meta?.code;
  return code === "23514" || meta === "23514" || String((error as Error)?.message ?? "").includes("programme_schedules_time_order_check");
}

/**
 * Every location has exactly one schedule header. Called when a station is
 * created so a brand-new location arrives with an empty, independent schedule
 * rather than nothing at all.
 */
export async function ensureLocationSchedule(db: Db, stationId: string) {
  return db.locationSchedule.upsert({
    where: { stationId },
    update: {},
    create: { stationId },
  });
}
