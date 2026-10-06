import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermissionResponse(PERMISSIONS.HRM_VIEW);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");
  const status = searchParams.get("status");

  const requests = await db.leaveRequest.findMany({
    where: {
      ...(stationId ? { staff: { stationId } } : {}),
      ...(status ? { status } : {}),
    },
    include: { staff: { select: { fullName: true, stationId: true } }, approvedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermissionResponse(PERMISSIONS.HRM_MANAGE);
  if (denied) return denied;

  const body = await req.json();
  const { staffId, leaveType, startDate, endDate, reason } = body;

  if (!staffId || !leaveType || !startDate || !endDate) return NextResponse.json({ error: "staffId, leaveType, startDate, endDate required" }, { status: 400 });

  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const leave = await db.leaveRequest.create({
    data: { staffId, leaveType, startDate: start, endDate: end, daysCount, reason: reason ?? null },
  });
  return NextResponse.json(leave, { status: 201 });
}
