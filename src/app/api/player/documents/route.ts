import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

/**
 * The player's own document locker.
 *
 * Documents are no longer collected on the public application form — a visitor
 * filling that form is only a lead. They are uploaded here, after an admin has
 * closed the lead and created the account, so every file arrives already
 * attached to a known player.
 */

/** Resolved from the user id rather than the JWT's playerId, which predates conversion. */
async function currentPlayer() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.player.findUnique({ where: { userId: session.user.id }, select: { id: true } });
}

export async function GET() {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [requirements, documents] = await Promise.all([
    db.fileRequirement.findMany({
      where: { isActive: true, appliesTo: { in: ["academy", "both"] } },
      orderBy: { order: "asc" },
    }),
    db.applicationFile.findMany({
      where: { playerId: player.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ requirements, documents });
}

const uploadSchema = z.object({
  requirementId: z.string().min(1),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  mimeType: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = uploadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const data = parsed.data;

  const requirement = await db.fileRequirement.findFirst({
    where: { id: data.requirementId, isActive: true, appliesTo: { in: ["academy", "both"] } },
  });
  if (!requirement) return NextResponse.json({ error: "Unknown document type" }, { status: 400 });

  // One file per requirement: re-uploading replaces rather than stacks, so the
  // admin reviewing the player never has to guess which copy is current.
  await db.applicationFile.deleteMany({ where: { playerId: player.id, requirementId: requirement.id } });

  const document = await db.applicationFile.create({
    data: {
      playerId: player.id,
      requirementId: requirement.id,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType ?? null,
      size: data.size ?? null,
    },
  });

  return NextResponse.json(document, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Scoped to the player so an id from someone else's locker deletes nothing.
  const { count } = await db.applicationFile.deleteMany({ where: { id, playerId: player.id } });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
