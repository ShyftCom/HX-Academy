import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const categorySlug = req.nextUrl.searchParams.get("category");

  const programmes = await db.programme.findMany({
    where: {
      isPubliclyListed: true,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    include: { category: true },
    orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
  });

  const categories = await db.programmeCategory.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });

  return NextResponse.json({ programmes, categories });
}
