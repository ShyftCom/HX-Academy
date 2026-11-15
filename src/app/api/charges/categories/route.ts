import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: Request) {
  const denied = await requirePermissionResponse(PERMISSIONS.FINANCE_VIEW);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");

  const categories = await db.chargeCategory.findMany({
    where: { OR: [{ isGlobal: true }, ...(stationId ? [{ stationId }] : [])] },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  // Categories label historical charges and drive the by-category chart, so
  // managing them sits with editing charges, not with recording one.
  const denied = await requirePermissionResponse(PERMISSIONS.CHARGES_EDIT);
  if (denied) return denied;

  const { name, color, stationId } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const cat = await db.chargeCategory.create({ data: { name, color: color ?? "#6B7280", stationId: stationId ?? null } });
  return NextResponse.json(cat, { status: 201 });
}
