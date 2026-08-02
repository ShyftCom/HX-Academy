import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserPermissions } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { role: true, player: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // The caller's effective permission names, so the shell can hide nav entries
  // and actions the user cannot use. Super Admin resolves to ["*"].
  //
  // Presentation only. Every mutating route still calls requirePermission() /
  // requirePermissionResponse() server-side — hiding a button is not the same
  // as authorising the endpoint behind it, and this changes neither.
  const permissions = await getUserPermissions(user.id);

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role?.name,
    isPlayer: !!user.player,
    playerId: user.player?.id,
    isActive: user.isActive,
    permissions,
  });
}
