import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;
  const category = req.nextUrl.searchParams.get("category");
  const faqs = await db.faq.findMany({
    where: category ? { category } : undefined,
    include: { programme: { select: { name: true } }, station: { select: { name: true } } },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });
  return NextResponse.json(faqs);
}

export async function POST(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!body.question || !body.answer) return NextResponse.json({ error: "question and answer are required" }, { status: 400 });
    const count = await db.faq.count({ where: { category: body.category ?? null } });
    const faq = await db.faq.create({
      data: { question: body.question, answer: body.answer, category: body.category ?? null, programmeId: body.programmeId ?? null, stationId: body.stationId ?? null, order: count },
    });
    return NextResponse.json(faq, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
