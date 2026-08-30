import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { hasPermission, requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

/**
 * Authorizes a request against one player record.
 *
 * Two callers share GET and PUT here and they need different rules: the player
 * portal reads and edits the signed-in player's OWN profile, while the back
 * office reads and edits anyone's. A flat permission gate would lock players
 * out of their own account; no gate at all — which is what this file had —
 * let any signed-in user read and rewrite every other player's record.
 *
 * So: your own record always, anyone else's only with the permission.
 *
 * Ownership is decided by the record's `userId`, not by the `playerId` carried
 * in the session token. The token is signed and trustworthy, but it is minted
 * at sign-in and would keep asserting a stale player id if the record were
 * ever relinked; the row is the authority on who owns it. The lookup is on an
 * indexed unique column and, for GET, replaces no query that was not already
 * being made.
 */
async function authorizePlayer(playerId: string, permission: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  const player = await db.player.findUnique({ where: { id: playerId }, select: { userId: true } });
  if (!player) {
    return { denied: NextResponse.json({ error: "Player not found" }, { status: 404 }) } as const;
  }
  const callerId = session.user.id;
  const isSelf = player.userId === callerId;
  if (!isSelf && !(await hasPermission(callerId, permission))) {
    return { denied: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { denied: null, callerId, isSelf } as const;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The payload below carries the player's payments, orders and subscriptions,
  // so an ungated read here handed over another family's whole financial
  // history along with their contact details.
  const gate = await authorizePlayer(id, PERMISSIONS.PLAYERS_VIEW);
  if (gate.denied) return gate.denied;

  const player = await db.player.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, lastLogin: true, isActive: true } },
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" } },
      payments: { include: { plan: true, paymentMethod: true }, orderBy: { createdAt: "desc" } },
      orders: { include: { items: { include: { product: true } }, status: true }, orderBy: { createdAt: "desc" } },
      documents: { include: { requirement: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  return NextResponse.json(player);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await authorizePlayer(id, PERMISSIONS.PLAYERS_EDIT);
  if (gate.denied) return gate.denied;
  const { callerId, isSelf } = gate;

  try {
    const body = await req.json();

    // A player editing their own profile may change only what the portal's
    // form actually offers. It posts the whole player object back with three
    // fields overridden, so without this the same request could also rewrite
    // the academy's own assignments — team, category, position — and the
    // medical notes and staff notes attached to them. Those belong to the
    // academy, not the player, even though the record is theirs.
    const data = isSelf
      ? {
          photo: body.photo ?? null,
          phone: body.phone ?? null,
          parentPhone: body.parentPhone ?? null,
          address: body.address ?? null,
        }
      : {
          fullName: body.fullName,
          photo: body.photo ?? null,
          phone: body.phone ?? null,
          email: body.email ?? null,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
          age: body.age ?? null,
          gender: body.gender ?? null,
          parentName: body.parentName ?? null,
          parentPhone: body.parentPhone ?? null,
          address: body.address ?? null,
          emergencyContact: body.emergencyContact ?? null,
          team: body.team ?? null,
          category: body.category ?? null,
          position: body.position ?? null,
          medicalNotes: body.medicalNotes ?? null,
          notes: body.notes ?? null,
        };

    const player = await db.player.update({ where: { id }, data });

    // Renaming the linked user account stays a back-office act, in step with
    // fullName above.
    if (!isSelf && body.fullName) {
      await db.user.update({ where: { id: player.userId }, data: { name: body.fullName } });
    }
    await logActivity({ userId: callerId, action: "update", module: "players", description: `Updated player: ${player.fullName}` });
    return NextResponse.json(player);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // This is the account-takeover path, and it is the reason this file needed
  // fixing most urgently: with `auth()` alone, any signed-in user — every
  // player included — could POST a new password for ANY player id and own that
  // account outright. It is deliberately permission-only, with no self branch:
  // a player changing their own password goes through
  // /api/auth/change-password, which demands the current one first. Allowing a
  // self path here would hand anyone who borrowed an unlocked session a way to
  // lock the real owner out without ever knowing their password.
  const denied = await requirePermissionResponse(PERMISSIONS.PLAYERS_EDIT);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();

    if (body.password) {
      if (body.password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      const player = await db.player.findUnique({ where: { id } });
      if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
      const hashed = await hashPassword(body.password);
      await db.user.update({ where: { id: player.userId }, data: { password: hashed } });
      await logActivity({ userId: session.user.id, action: "update", module: "players", description: `Reset password for player: ${player.fullName}` });
      return NextResponse.json({ message: "Password updated" });
    }

    const player = await db.player.update({
      where: { id },
      data: { status: body.status },
    });
    await db.user.update({ where: { id: player.userId }, data: { isActive: body.status === "active" } });
    await logActivity({ userId: session.user.id, action: "status_change", module: "players", description: `Set player ${player.fullName} to ${body.status}` });
    return NextResponse.json(player);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Deletes the player and cascades away the linked user account, so on
  // `auth()` alone any signed-in user could erase any other player outright.
  const denied = await requirePermissionResponse(PERMISSIONS.PLAYERS_DELETE);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const player = await db.player.findUnique({ where: { id } });
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    await db.user.delete({ where: { id: player.userId } });
    await logActivity({ userId: session.user.id, action: "delete", module: "players", description: `Deleted player: ${player.fullName}` });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
