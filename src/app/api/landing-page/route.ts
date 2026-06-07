import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  let page = await db.landingPage.findFirst({
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!page) {
    page = await db.landingPage.create({
      data: { isPublished: false },
      include: { sections: true },
    });
  }
  return NextResponse.json(page);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const page = await db.landingPage.findFirst();
    if (!page) return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    const updated = await db.landingPage.update({ where: { id: page.id }, data: { isPublished: body.isPublished } });
    return NextResponse.json(updated);
  } catch { return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
}
