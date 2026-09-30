import type { Session } from "next-auth";
import { db } from "@/lib/db";

/**
 * The player a signed-in login is currently acting as.
 *
 * One login can own several players — siblings share their parent's account —
 * so "the caller's player" is whichever child the portal has selected. That
 * choice travels in the session as `playerId`, but it is only a preference:
 * the row is re-checked here against the caller's user id, so a stale or
 * forged id can never reach another family's record. When it is missing or no
 * longer the caller's (e.g. the child was deleted), the login's first child is
 * used instead. Returns null for logins with no player at all (staff).
 */
export async function getActivePlayer(session: Session | null) {
  const userId = session?.user?.id;
  if (!userId) return null;

  const preferred = (session.user as { playerId?: string | null }).playerId;
  if (preferred) {
    const player = await db.player.findFirst({ where: { id: preferred, userId } });
    if (player) return player;
  }
  return db.player.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
}

/**
 * The child a self-service request is for: the one it names, if that child is
 * on this login, otherwise the active one. A named child that belongs to
 * someone else yields null — never a silent fallback to the caller's own.
 */
export async function resolveOwnPlayer(session: Session | null, requestedId?: unknown) {
  const userId = session?.user?.id;
  if (!userId) return null;
  if (typeof requestedId === "string" && requestedId) {
    return db.player.findFirst({ where: { id: requestedId, userId } });
  }
  return getActivePlayer(session);
}

/** Every child on one login, oldest record first — the order the switcher shows. */
export function listPlayersForUser(userId: string) {
  return db.player.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, photo: true, category: true },
  });
}
