import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public, unauthenticated: powers every slug-driven page (homepage, and
// every new freeform Showcase Website page) via SectionRenderer.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const page = await db.landingPage.findUnique({
    where: { slug },
    include: { sections: { where: { isEnabled: true }, orderBy: { order: "asc" } } },
  });

  if (!page || !page.isPublished) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(page);
}
