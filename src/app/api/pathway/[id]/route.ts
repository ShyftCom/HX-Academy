import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

const EDITABLE_FIELDS = [
  "name", "nameFr", "nameAr", "ageRangeLabel", "ageRangeLabelFr", "ageRangeLabelAr",
  "color", "icon", "description", "descriptionFr", "descriptionAr",
  "entryRequirements", "entryRequirementsFr", "entryRequirementsAr",
  "objectives", "objectivesFr", "objectivesAr", "programmeId", "isActive",
] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) if (body[key] !== undefined) data[key] = body[key];
    const level = await db.pathwayLevel.update({ where: { id }, data });
    return NextResponse.json(level);
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
    await db.pathwayLevel.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
