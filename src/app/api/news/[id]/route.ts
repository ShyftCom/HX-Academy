import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;

  const { id } = await params;
  const article = await db.newsArticle.findUnique({ where: { id }, include: { category: true } });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(article);
}

const EDITABLE_FIELDS = [
  "slug", "title", "titleFr", "titleAr", "excerpt", "excerptFr", "excerptAr",
  "body", "bodyFr", "bodyAr", "coverImageUrl", "categoryId", "authorName",
  "isPublished", "isFeatured", "metaTitle", "metaDescription", "ogImage",
] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) if (body[key] !== undefined) data[key] = body[key];
    if (typeof data.slug === "string") data.slug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");

    // Publishing for the first time stamps publishedAt if not already set.
    if (data.isPublished === true) {
      const existing = await db.newsArticle.findUnique({ where: { id }, select: { publishedAt: true } });
      if (!existing?.publishedAt) data.publishedAt = new Date();
    }

    const article = await db.newsArticle.update({ where: { id }, data });
    return NextResponse.json(article);
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
    await db.newsArticle.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
