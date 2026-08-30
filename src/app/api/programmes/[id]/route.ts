import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;

  const { id } = await params;
  const programme = await db.programme.findUnique({
    where: { id },
    include: {
      category: true,
      schedules: { orderBy: { order: "asc" }, include: { station: true, coach: true } },
      venues: { include: { venue: true }, orderBy: { order: "asc" } },
      coaches: { include: { coach: true }, orderBy: { order: "asc" } },
      faqs: { orderBy: { order: "asc" } },
    },
  });
  if (!programme) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(programme);
}

const EDITABLE_FIELDS = [
  "slug", "name", "nameFr", "nameAr",
  "shortDescription", "shortDescriptionFr", "shortDescriptionAr",
  "fullDescription", "fullDescriptionFr", "fullDescriptionAr",
  "heroImageUrl", "cardImageUrl", "categoryId",
  "ageRangeLabel", "ageRangeLabelFr", "ageRangeLabelAr",
  "minAge", "maxAge", "priceFrom",
  "priceLabel", "priceLabelFr", "priceLabelAr",
  "promoBannerText", "promoBannerTextFr", "promoBannerTextAr", "promoBannerUrl", "bookingUrl",
  "metaTitle", "metaTitleFr", "metaTitleAr",
  "metaDescription", "metaDescriptionFr", "metaDescriptionAr", "ogImage",
  "isFeatured", "isPubliclyListed", "displayOrder",
] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (typeof data.slug === "string") {
      data.slug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");
    }
    const programme = await db.programme.update({ where: { id }, data });
    return NextResponse.json(programme);
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
    await db.programme.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
