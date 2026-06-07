import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const methods = await db.paymentMethod.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(methods);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
