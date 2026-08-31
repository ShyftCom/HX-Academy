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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Signed-in only. The survey id is public (it rides along on
  // /api/public/landing), and the rows carry `disqualifyingOptions` — the
  // answers a Super Admin marked as rejecting an applicant. Handing those to
  // an anonymous caller would tell every visitor which answers to avoid.
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const questions = await db.surveyQuestion.findMany({ where: { surveyId: id }, orderBy: { order: "asc" } });
  return NextResponse.json(questions);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const count = await db.surveyQuestion.count({ where: { surveyId: id } });
    const question = await db.surveyQuestion.create({
      data: {
        surveyId: id,
        question: body.question,
        questionType: body.questionType ?? "text",
        options: body.options ? JSON.stringify(body.options) : null,
        isRequired: body.isRequired ?? false,
        disqualifyingOptions: disqualifyingFor(body.options, body.disqualifyingOptions),
        order: count,
      },
    });
    return NextResponse.json(question, { status: 201 });
  } catch { return NextResponse.json({ error: "Create failed" }, { status: 500 }); }
}
