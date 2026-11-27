import { db } from "@/lib/db";
import { defaultAcademyId, resolveAcademyId } from "@/lib/academy-scope";

export { ACADEMY_COOKIE, runWithAcademy } from "@/lib/academy-scope";

export type AcademySummary = { id: string; slug: string; name: string };

const reader = db as unknown as Parameters<typeof resolveAcademyId>[0];

/**
 * The academy this request works in: runWithAcademy, else the staff member's
 * cookie, else the default academy. Outside any request (scripts) it is the
 * default academy too — never null while one academy exists.
 */
export async function getActiveAcademyId(): Promise<string | null> {
  return (await resolveAcademyId(reader)) ?? (await defaultAcademyId(reader));
}

/**
 * The academies a login may work in. Super Admin reaches every active academy;
 * everyone else, the ones they hold a membership in. Player logins have none.
 */
export async function listAccessibleAcademies(userId: string): Promise<AcademySummary[]> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { isActive: true, role: { select: { name: true } } } });
  if (!user?.isActive) return [];
  const select = { id: true, slug: true, name: true } as const;
  if (user.role?.name === "Super Admin") {
    return db.academy.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select });
  }
  return db.academy.findMany({ where: { isActive: true, members: { some: { userId } } }, orderBy: { sortOrder: "asc" }, select });
}

/**
 * When the academy choice expires: the next midnight in Algeria (UTC+1, no
 * daylight saving), so a staff member working in both academies is asked
 * again at the start of each day, as the spec asks.
 */
export function academyChoiceExpiry(now = new Date()): Date {
  const ALGIERS_OFFSET_MS = 60 * 60 * 1000;
  const local = new Date(now.getTime() + ALGIERS_OFFSET_MS);
  const nextLocalMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  return new Date(nextLocalMidnight - ALGIERS_OFFSET_MS);
}

/**
 * Gives `userId` `roleId` in the active academy, or removes their membership
 * there when `roleId` is null. Every screen that sets a staff member's role
 * calls this alongside writing User.roleId, which still decides Super Admin
 * and the Player portal.
 */
export async function setMembershipInActiveAcademy(userId: string, roleId: string | null) {
  const academyId = await getActiveAcademyId();
  if (!academyId) return;
  const role = roleId ? await db.role.findUnique({ where: { id: roleId }, select: { name: true } }) : null;
  if (!roleId || role?.name === "Player") {
    await db.userAcademy.deleteMany({ where: { userId, academyId } });
    return;
  }
  await db.userAcademy.upsert({
    where: { userId_academyId: { userId, academyId } },
    update: { roleId },
    create: { userId, academyId, roleId },
  });
}
