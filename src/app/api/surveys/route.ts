import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const surveys = await db.survey.findMany({
    include: { _count: { select: { questions: true, answers: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(surveys);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const survey = await db.survey.create({ data: { title: body.title, description: body.description ?? null, isActive: body.isActive ?? true } });
    return NextResponse.json(survey, { status: 201 });
  } catch { return NextResponse.json({ error: "Create failed" }, { status: 500 }); }
}
