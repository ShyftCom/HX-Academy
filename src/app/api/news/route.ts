import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;

  const articles = await db.newsArticle.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    let slug = slugify(body.title);
    let suffix = 1;
    while (await db.newsArticle.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${slugify(body.title)}-${suffix}`;
    }

    const article = await db.newsArticle.create({
      data: { title: body.title, slug, isPublished: false },
    });
    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
