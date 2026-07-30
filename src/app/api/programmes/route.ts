import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;

  const programmes = await db.programme.findMany({
    include: { category: true, _count: { select: { schedules: true, leads: true } } },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(programmes);
}

export async function POST(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    let slug = body.slug ? slugify(body.slug) : slugify(body.name);
    let suffix = 1;
    while (await db.programme.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${slugify(body.slug || body.name)}-${suffix}`;
    }

    const count = await db.programme.count();
    const programme = await db.programme.create({
      data: {
        slug,
        name: body.name,
        nameFr: body.nameFr ?? null,
        nameAr: body.nameAr ?? null,
        categoryId: body.categoryId ?? null,
        isPubliclyListed: body.isPubliclyListed ?? false,
        displayOrder: count,
      },
    });
    return NextResponse.json(programme, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
