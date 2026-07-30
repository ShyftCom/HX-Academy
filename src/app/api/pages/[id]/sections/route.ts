import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import { SECTION_TYPES, type SectionType } from "@/components/website/sections/sectionTypes";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id: landingPageId } = await params;
  try {
    const body = await req.json();
    const type = body.type as SectionType;
    if (!SECTION_TYPES[type]) return NextResponse.json({ error: "Unknown section type" }, { status: 400 });

    const page = await db.landingPage.findUnique({ where: { id: landingPageId } });
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

    const count = await db.landingSection.count({ where: { landingPageId } });
    const section = await db.landingSection.create({
      data: {
        landingPageId,
        type,
        title: body.title ?? null,
        content: JSON.stringify(body.content ?? SECTION_TYPES[type].defaultContent),
        order: count,
        isEnabled: body.isEnabled ?? true,
      },
    });
    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
