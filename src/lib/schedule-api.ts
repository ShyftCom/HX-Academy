import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERMISSIONS, requireStationAccessResponse } from "@/lib/permissions";
import {
  findOverlappingSlot,
  isOverlapError,
  isTimeOrderError,
  slotInputSchema,
  slotUpdateSchema,
  slotWriteData,
} from "@/lib/schedule";

/**
 * One implementation of slot CRUD, shared by the location-scoped routes
 * (/api/locations/[id]/schedule/...) and the older programme-scoped ones
 * (/api/programmes/[id]/schedule/...), which are now thin delegates.
 *
 * Every entry point resolves the slot's *location* first and authorizes against
 * that, so a location-scoped admin cannot reach another branch's schedule
 * through either URL shape.
 */

export const SLOT_INCLUDE = { station: { select: { id: true, name: true } }, coach: { select: { id: true, fullName: true } } } as const;

/** Errors the client turns into translated copy; `conflict` names the slot in the way. */
type ConflictPayload = { error: string; conflict?: Record<string, unknown> };

function overlapResponse(conflict: Awaited<ReturnType<typeof findOverlappingSlot>>) {
  const body: ConflictPayload = {
    error: "schedule_overlap",
    conflict: conflict
      ? { ageGroup: conflict.ageGroup, sessionName: conflict.sessionName, day: conflict.day, startTime: conflict.startTime, endTime: conflict.endTime, field: conflict.field }
      : undefined,
  };
  return NextResponse.json(body, { status: 409 });
}

/** Maps a constraint violation that beat the pre-check (a concurrent write) onto the same shape. */
function mapWriteError(error: unknown) {
  if (isOverlapError(error)) return overlapResponse(null);
  if (isTimeOrderError(error)) return NextResponse.json({ error: "schedule_time_order" }, { status: 400 });
  console.error(error);
  return null;
}

export async function listSlots(stationId: string) {
  const { denied } = await requireStationAccessResponse(PERMISSIONS.WEBSITE_VIEW, stationId);
  if (denied) return denied;

  const [schedule, slots] = await Promise.all([
    db.locationSchedule.findUnique({ where: { stationId } }),
    db.scheduleSlot.findMany({ where: { stationId }, orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }, { order: "asc" }], include: SLOT_INCLUDE }),
  ]);
  return NextResponse.json({ schedule, slots });
}

export async function createSlot(body: unknown, stationId: string) {
  const { denied } = await requireStationAccessResponse(PERMISSIONS.WEBSITE_EDIT, stationId);
  if (denied) return denied;

  const parsed = slotInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const data = slotWriteData(parsed.data);
  const conflict = await findOverlappingSlot(db, {
    stationId,
    field: (data.field as string) ?? "",
    dayOfWeek: (data.dayOfWeek as number) ?? null,
    startMinutes: (data.startMinutes as number) ?? null,
    endMinutes: (data.endMinutes as number) ?? null,
    isActive: (data.isActive as boolean) ?? true,
  });
  if (conflict) return overlapResponse(conflict);

  try {
    const count = await db.scheduleSlot.count({ where: { stationId } });
    const row = await db.scheduleSlot.create({ data: { ...data, stationId, order: count } as never, include: SLOT_INCLUDE });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return mapWriteError(error) ?? NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

export async function updateSlot(body: unknown, slotId: string) {
  const existing = await db.scheduleSlot.findUnique({ where: { id: slotId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { denied } = await requireStationAccessResponse(PERMISSIONS.WEBSITE_EDIT, existing.stationId);
  if (denied) return denied;

  const parsed = slotUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  // Moving a slot to another location needs access to the destination too —
  // otherwise write access to one branch would be a way to push sessions into
  // any other.
  const targetStationId = parsed.data.stationId ?? existing.stationId;
  if (targetStationId !== existing.stationId) {
    const target = await requireStationAccessResponse(PERMISSIONS.WEBSITE_EDIT, targetStationId);
    if (target.denied) return target.denied;
  }

  const data = slotWriteData(parsed.data);

  // Check the row as it will be, not as it was: reactivating, re-timing or
  // relocating an existing slot can collide just as easily as inserting one.
  const next = { ...existing, ...data } as typeof existing;
  const conflict = await findOverlappingSlot(
    db,
    { stationId: targetStationId, field: next.field ?? "", dayOfWeek: next.dayOfWeek, startMinutes: next.startMinutes, endMinutes: next.endMinutes, isActive: next.isActive },
    slotId,
  );
  if (conflict) return overlapResponse(conflict);

  try {
    const row = await db.scheduleSlot.update({ where: { id: slotId }, data: data as never, include: SLOT_INCLUDE });
    return NextResponse.json(row);
  } catch (error) {
    return mapWriteError(error) ?? NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function deleteSlot(slotId: string) {
  const existing = await db.scheduleSlot.findUnique({ where: { id: slotId }, select: { stationId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { denied } = await requireStationAccessResponse(PERMISSIONS.WEBSITE_EDIT, existing.stationId);
  if (denied) return denied;

  try {
    await db.scheduleSlot.delete({ where: { id: slotId } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

/**
 * Reorder within one location. The ids are re-read and filtered to that station
 * before anything is written, so a caller cannot reorder — or discover — slots
 * belonging to a location they cannot reach by posting foreign ids.
 */
export async function reorderSlots(body: unknown, stationId: string) {
  const { denied } = await requireStationAccessResponse(PERMISSIONS.WEBSITE_EDIT, stationId);
  if (denied) return denied;

  const items: { id: string; order: number }[] = (body as { items?: { id: string; order: number }[] })?.items ?? [];
  const owned = new Set((await db.scheduleSlot.findMany({ where: { stationId }, select: { id: true } })).map((s) => s.id));

  try {
    await db.$transaction(items.filter((i) => owned.has(i.id)).map((i) => db.scheduleSlot.update({ where: { id: i.id }, data: { order: i.order } })));
    return NextResponse.json({ message: "Reordered" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Reorder failed" }, { status: 500 });
  }
}

/**
 * Copy every slot from one location onto another, as a starting template.
 *
 * Requires access to *both* locations — otherwise it would be a way to read a
 * schedule you cannot open. Slots are copied inactive-preserving but conflict
 * checks still apply, so a copy that would double-book a pitch is skipped and
 * reported rather than aborting the whole copy.
 */
export async function duplicateSchedule(body: unknown, targetStationId: string) {
  // Authorize the target location before looking at the body at all. Validating
  // first let an unauthenticated caller tell a malformed request (400) from a
  // well-formed one (401), which is a free probe of the request shape.
  const target = await requireStationAccessResponse(PERMISSIONS.WEBSITE_EDIT, targetStationId);
  if (target.denied) return target.denied;

  const sourceStationId = (body as { sourceStationId?: string })?.sourceStationId;
  if (!sourceStationId) return NextResponse.json({ error: "sourceStationId is required" }, { status: 400 });
  if (sourceStationId === targetStationId) return NextResponse.json({ error: "source and target are the same location" }, { status: 400 });

  const source = await requireStationAccessResponse(PERMISSIONS.WEBSITE_VIEW, sourceStationId);
  if (source.denied) return source.denied;

  const slots = await db.scheduleSlot.findMany({ where: { stationId: sourceStationId }, orderBy: { order: "asc" } });
  const offset = await db.scheduleSlot.count({ where: { stationId: targetStationId } });

  let copied = 0;
  const skipped: string[] = [];
  for (const [i, slot] of slots.entries()) {
    const conflict = await findOverlappingSlot(db, { ...slot, stationId: targetStationId });
    if (conflict) {
      skipped.push(slot.ageGroup);
      continue;
    }
    try {
      await db.scheduleSlot.create({
        data: {
          stationId: targetStationId,
          programmeId: slot.programmeId,
          ageGroup: slot.ageGroup, minAge: slot.minAge, maxAge: slot.maxAge,
          dobStart: slot.dobStart, dobEnd: slot.dobEnd,
          sessionName: slot.sessionName, sessionType: slot.sessionType,
          day: slot.day, dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime, endTime: slot.endTime,
          startMinutes: slot.startMinutes, endMinutes: slot.endMinutes,
          field: slot.field, coachId: slot.coachId,
          capacity: slot.capacity, availableSpaces: slot.availableSpaces,
          price: slot.price, registrationStatus: slot.registrationStatus,
          isActive: slot.isActive, order: offset + i,
        },
      });
      copied++;
    } catch (error) {
      if (isOverlapError(error)) { skipped.push(slot.ageGroup); continue; }
      throw error;
    }
  }
  return NextResponse.json({ copied, skipped });
}
