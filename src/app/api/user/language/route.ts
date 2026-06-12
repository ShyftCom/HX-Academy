import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { language } = await req.json();
  if (!["fr", "eng", "ar"].includes(language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  await db.user.update({
    where: { email: session.user.email },
    data: { language },
  });

  return NextResponse.json({ ok: true });
}
