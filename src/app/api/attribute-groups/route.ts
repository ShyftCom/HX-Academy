import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermissionResponse(PERMISSIONS.STORE_VIEW);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");

  const groups = await db.attributeGroup.findMany({
    where: stationId ? { stationId } : undefined,
    include: { attributes: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermissionResponse(PERMISSIONS.STORE_EDIT);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { name, stationId } = body;
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const group = await db.attributeGroup.create({
      data: { name, stationId: stationId ?? null },
      include: { attributes: true },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
