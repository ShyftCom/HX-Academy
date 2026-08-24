import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const programme = await db.programme.findUnique({
    where: { slug },
    include: {
      category: true,
      schedules: { where: { isActive: true }, orderBy: { order: "asc" }, include: { station: true, coach: true } },
      venues: { include: { venue: true }, orderBy: { order: "asc" } },
      coaches: { include: { coach: true }, orderBy: { order: "asc" } },
      faqs: { where: { isPublished: true }, orderBy: { order: "asc" } },
    },
  });

  if (!programme || !programme.isPubliclyListed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const related = await db.programme.findMany({
    where: { isPubliclyListed: true, id: { not: programme.id }, ...(programme.categoryId ? { categoryId: programme.categoryId } : {}) },
    include: { category: true },
    orderBy: { displayOrder: "asc" },
    take: 3,
  });

  return NextResponse.json({ programme, related });
}
