import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  // Deliberately session-only. The player portal reads this to show a player
  // where to send the money — bank details, cash instructions — so gating it
  // on a back-office permission would leave them unable to pay at all. The
  // account details here are the academy's own, published on purpose.
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const methods = await db.paymentMethod.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(methods);
}

export async function POST(req: NextRequest) {
  // Payment methods are configuration, managed from Settings — and whoever
  // controls them controls the bank account players are told to pay into.
  const denied = await requirePermissionResponse(PERMISSIONS.SETTINGS_EDIT);
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const method = await db.paymentMethod.create({
      data: { name: body.name, instructions: body.instructions ?? null, accountDetails: body.accountDetails ?? null, isActive: body.isActive ?? true },
    });
    return NextResponse.json(method, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
