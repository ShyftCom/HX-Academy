import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const denied = await requirePermissionResponse(PERMISSIONS.FILE_REQUIREMENTS_MANAGE);
  if (denied) return denied;

  const requirements = await db.fileRequirement.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { applicationFiles: true } } },
  });
  return NextResponse.json({ requirements });
}

export async function POST(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.FILE_REQUIREMENTS_MANAGE);
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const maxOrder = await db.fileRequirement.findFirst({ orderBy: { order: "desc" } });
    const nextOrder = (maxOrder?.order ?? -1) + 1;

    const req_ = await db.fileRequirement.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        isRequired: body.isRequired ?? true,
        allowedTypes: body.allowedTypes ?? "image/*,.pdf,.docx,.xlsx",
        maxSizeMb: body.maxSizeMb ?? 10,
        isActive: body.isActive ?? true,
        order: body.order ?? nextOrder,
        appliesTo: body.appliesTo ?? "academy",
      },
    });
    return NextResponse.json(req_, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
