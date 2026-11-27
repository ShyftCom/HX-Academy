import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ACADEMY_COOKIE, academyChoiceExpiry, listAccessibleAcademies } from "@/lib/academy";

/** Switches the academy this browser works in, without signing out. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const academies = await listAccessibleAcademies(session.user.id);
  const academy = academies.find((a) => a.slug === body.slug);
  if (!academy) return NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 });

  const res = NextResponse.json({ active: academy });
  res.cookies.set(ACADEMY_COOKIE, academy.slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: academyChoiceExpiry(),
  });
  return res;
}
