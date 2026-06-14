import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { action } = await req.json();

  if (!["approve", "reject"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const leave = await db.leaveRequest.update({
    where: { id },
    data: { status: action === "approve" ? "approved" : "rejected", approvedById: session.user.id },
  });
  return NextResponse.json(leave);
}
