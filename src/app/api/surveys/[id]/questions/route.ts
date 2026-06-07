import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        order: count,
      },
    });
    return NextResponse.json(question, { status: 201 });
  } catch { return NextResponse.json({ error: "Create failed" }, { status: 500 }); }
}
