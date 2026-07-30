import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;

  const { id } = await params;
  const page = await db.landingPage.findUnique({
    where: { id },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  try {
    const body = await req.json();
    if (body.slug && !/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json({ error: "slug must be lowercase letters, numbers and hyphens" }, { status: 400 });
    }
    const page = await db.landingPage.update({
      where: { id },
      data: {
        slug: body.slug,
        title: body.title,
        template: body.template,
        isPublished: body.isPublished,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        ogImage: body.ogImage,
        canonicalUrl: body.canonicalUrl,
        noindex: body.noindex,
        nofollow: body.nofollow,
        breadcrumbLabel: body.breadcrumbLabel,
      },
    });
    return NextResponse.json(page);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  const page = await db.landingPage.findUnique({ where: { id } });
  if (page?.slug === "home") {
    return NextResponse.json({ error: "The homepage cannot be deleted" }, { status: 400 });
  }
  try {
    await db.landingPage.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
