import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

const EDITABLE_FIELDS = [
  "question", "questionFr", "questionAr", "answer", "answerFr", "answerAr",
  "category", "programmeId", "stationId", "isPublished", "isFeatured",
] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) if (body[key] !== undefined) data[key] = body[key];
    const faq = await db.faq.update({ where: { id }, data });
    return NextResponse.json(faq);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;
  const { id } = await params;
  try {
    await db.faq.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
