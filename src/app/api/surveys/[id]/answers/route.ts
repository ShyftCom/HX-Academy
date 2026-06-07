import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const answers = await db.surveyAnswer.findMany({
    where: { surveyId: id },
    include: { question: true, lead: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(answers);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    // body.answers: Array<{ questionId: string; answer: string }>
    await db.surveyAnswer.createMany({
      data: body.answers.map((a: { questionId: string; answer: string }) => ({
        surveyId: id,
        questionId: a.questionId,
        answer: a.answer,
        leadId: body.leadId ?? null,
      })),
    });
    return NextResponse.json({ message: "Answers saved" }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
