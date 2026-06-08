import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requirements = await db.fileRequirement.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { applicationFiles: true } } },
  });
  return NextResponse.json(requirements);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const maxOrder = await db.fileRequirement.findFirst({ orderBy: { order: "desc" } });
    const nextOrder = (maxOrder?.order ?? -1) + 1;

    const req_ = await db.fileRequirement.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        isRequired: body.isRequired ?? true,
        allowedTypes: body.allowedTypes ?? "image/*,.pdf",
        maxSizeMb: body.maxSizeMb ?? 10,
        isActive: body.isActive ?? true,
        order: body.order ?? nextOrder,
      },
    });
    return NextResponse.json(req_, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
