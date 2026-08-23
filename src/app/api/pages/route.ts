import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

// Generalized, slug-based successor to /api/landing-page (which only ever
// operated on a single implicit row). That route and its orphaned admin UI
// are left in place, untouched, but unused going forward — nothing else in
// the codebase calls them, so removing them isn't required for correctness,
// only for tidiness, and leaving dead code alone is the lower-risk choice.
export async function GET() {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;

  const pages = await db.landingPage.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { sections: true } } },
  });
  return NextResponse.json(pages);
}

export async function POST(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.slug || !/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json({ error: "slug is required and must be lowercase letters, numbers and hyphens" }, { status: 400 });
    }
    const existing = await db.landingPage.findUnique({ where: { slug: body.slug } });
    if (existing) return NextResponse.json({ error: "A page with this slug already exists" }, { status: 409 });

    const page = await db.landingPage.create({
      data: {
        slug: body.slug,
        title: body.title ?? body.slug,
        template: body.template ?? "default",
        isPublished: body.isPublished ?? false,
        metaTitle: body.metaTitle ?? null,
        metaTitleFr: body.metaTitleFr ?? null,
        metaTitleAr: body.metaTitleAr ?? null,
        metaDescription: body.metaDescription ?? null,
        metaDescriptionFr: body.metaDescriptionFr ?? null,
        metaDescriptionAr: body.metaDescriptionAr ?? null,
        breadcrumbLabel: body.breadcrumbLabel ?? null,
        breadcrumbLabelFr: body.breadcrumbLabelFr ?? null,
        breadcrumbLabelAr: body.breadcrumbLabelAr ?? null,
      },
    });
    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
