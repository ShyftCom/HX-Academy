import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;

  const attributes = await db.attribute.findMany({
    where: { groupId },
    orderBy: { value: "asc" },
  });

  return NextResponse.json(attributes);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;

  try {
    const body = await req.json();
    const { value, colorHex } = body;
    if (!value) return NextResponse.json({ error: "Value required" }, { status: 400 });

    const attribute = await db.attribute.create({
      data: { groupId, value, colorHex: colorHex ?? null },
    });

    return NextResponse.json(attribute, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
