import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;
  const coaches = await db.coach.findMany({ include: { station: { select: { name: true } } }, orderBy: { order: "asc" } });
  return NextResponse.json(coaches);
}

export async function POST(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!body.fullName) return NextResponse.json({ error: "fullName is required" }, { status: 400 });
    const count = await db.coach.count();
    const coach = await db.coach.create({ data: { fullName: body.fullName, role: body.role ?? null, stationId: body.stationId ?? null, order: count } });
    return NextResponse.json(coach, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
