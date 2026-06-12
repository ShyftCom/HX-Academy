import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/lead-statuses/reorder
// body: { order: [{ id: string, order: number }] }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const items: { id: string; order: number }[] = body.order;
    if (!Array.isArray(items)) return NextResponse.json({ error: "order array required" }, { status: 400 });

    await db.$transaction(
      items.map(({ id, order }) =>
        db.leadStatus.update({ where: { id }, data: { order } })
      )
    );

    return NextResponse.json({ message: "Reordered" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Reorder failed" }, { status: 500 });
  }
}
