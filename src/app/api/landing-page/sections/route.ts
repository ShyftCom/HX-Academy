import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const page = await db.landingPage.findFirst({ include: { sections: { orderBy: { order: "asc" } } } });
  return NextResponse.json(page?.sections ?? []);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    let page = await db.landingPage.findFirst();
    if (!page) page = await db.landingPage.create({ data: { isPublished: false } });
    const count = await db.landingSection.count({ where: { landingPageId: page.id } });
    const section = await db.landingSection.create({
      data: {
        landingPageId: page.id,
        type: body.type,
        title: body.title ?? null,
        content: JSON.stringify(body.content ?? {}),
        order: count,
        isEnabled: body.isEnabled ?? true,
      },
    });
    return NextResponse.json(section, { status: 201 });
  } catch { return NextResponse.json({ error: "Create failed" }, { status: 500 }); }
}
