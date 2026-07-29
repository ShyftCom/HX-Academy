import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id: landingPageId, sectionId } = await params;
  try {
    const body = await req.json();
    const section = await db.landingSection.update({
      where: { id: sectionId, landingPageId },
      data: {
        title: body.title ?? null,
        content: body.content !== undefined ? JSON.stringify(body.content) : undefined,
        isEnabled: body.isEnabled,
      },
    });
    return NextResponse.json(section);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id: landingPageId, sectionId } = await params;
  try {
    await db.landingSection.delete({ where: { id: sectionId, landingPageId } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
