import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { APPLICATION_SURVEY_SETTING } from "@/lib/setting-keys";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Signed-in only. The survey id is public (it rides along on
  // /api/public/landing), and the rows carry `disqualifyingOptions` — the
  // answers a Super Admin marked as rejecting an applicant. Handing those to
  // an anonymous caller would tell every visitor which answers to avoid.
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const survey = await db.survey.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(survey);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const survey = await db.survey.update({ where: { id }, data: { title: body.title, description: body.description ?? null, isActive: body.isActive } });
    return NextResponse.json(survey);
  } catch { return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await db.survey.delete({ where: { id } });
    // Leave no dangling pointer behind: the public form would silently skip
    // the survey step, and the picker would show nothing selected while the
    // setting still held a deleted id.
    await db.setting.deleteMany({ where: { key: APPLICATION_SURVEY_SETTING, value: id } });
    return NextResponse.json({ message: "Deleted" });
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }); }
}
