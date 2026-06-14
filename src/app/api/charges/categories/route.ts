import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");

  const categories = await db.chargeCategory.findMany({
    where: { OR: [{ isGlobal: true }, ...(stationId ? [{ stationId }] : [])] },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color, stationId } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const cat = await db.chargeCategory.create({ data: { name, color: color ?? "#6B7280", stationId: stationId ?? null } });
  return NextResponse.json(cat, { status: 201 });
}
