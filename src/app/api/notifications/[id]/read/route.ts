import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Scoped to the caller's own notifications. This updated by id alone, so any
  // signed-in user could mark anyone else's notification read — the one route
  // in this group that was not already filtered by userId. That is a way to
  // hide things rather than to read them: "New Payment Submitted" is delivered
  // here to every admin, so an attacker who filed a payment could mark the
  // alerts about it read and take them out of the unread count staff actually
  // look at.
  //
  // updateMany rather than update, because update() throws when its where
  // clause matches nothing and cannot filter on a non-unique column; count
  // lets a miss answer 404 instead of a 500. A miss is both "no such
  // notification" and "not yours", which are deliberately indistinguishable —
  // otherwise the response tells a caller whether an id exists.
  const { count } = await db.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ message: "Marked as read" });
}
