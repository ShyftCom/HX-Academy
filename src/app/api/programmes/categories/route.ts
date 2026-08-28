import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;

  const categories = await db.programmeCategory.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { programmes: true } } } });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const count = await db.programmeCategory.count();
    const category = await db.programmeCategory.create({
      data: { name: body.name, nameFr: body.nameFr ?? null, nameAr: body.nameAr ?? null, slug: slugify(body.name), colorTag: body.colorTag ?? "#A32F33", order: count },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
