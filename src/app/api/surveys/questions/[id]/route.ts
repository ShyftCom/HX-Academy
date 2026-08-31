import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";


/**
 * Options the Super Admin marked as disqualifying, narrowed to options the
 * question actually offers. A stale value left over from renaming an option
 * would silently block every applicant, so it is dropped rather than stored.
 */
function disqualifyingFor(options: unknown, disqualifying: unknown): string | null {
  if (!Array.isArray(disqualifying) || !Array.isArray(options)) return null;
  const offered = new Set(options.map(String));
  const kept = disqualifying.map(String).filter((o) => offered.has(o));
  return kept.length ? JSON.stringify(kept) : null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const q = await db.surveyQuestion.update({
      where: { id },
      data: {
        question: body.question,
        questionType: body.questionType,
        options: body.options ? JSON.stringify(body.options) : null,
        disqualifyingOptions: disqualifyingFor(body.options, body.disqualifyingOptions),
        isRequired: body.isRequired,
        order: body.order,
      },
    });
    return NextResponse.json(q);
  } catch { return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await db.surveyQuestion.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }); }
}
