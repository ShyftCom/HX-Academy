import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { language } = await req.json();
  // "eng" was the public site's URL segment for English and is retired with it.
  // "en" is the back-office i18next code — which the switcher has always sent
  // and this route has always rejected with a 400, silently dropping the
  // preference. Accepting it fixes that; the public site sends fr/ar.
  if (!["fr", "en", "ar"].includes(language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  await db.user.update({
    where: { email: session.user.email },
    data: { language },
  });

  return NextResponse.json({ ok: true });
}
