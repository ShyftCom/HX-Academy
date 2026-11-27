import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { ACADEMY_COOKIE, getActiveAcademyId, listAccessibleAcademies } from "@/lib/academy";

/**
 * The academies the signed-in user may work in, which one is active, and
 * whether to ask them to choose: once a day, when they can reach more than one.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const academies = await listAccessibleAcademies(session.user.id);
  const activeId = await getActiveAcademyId();
  const chosen = (await cookies()).get(ACADEMY_COOKIE)?.value;
  const active = academies.find((a) => a.id === activeId) ?? null;

  return NextResponse.json({
    academies,
    active,
    // No choice today, or a choice the user can no longer reach.
    needsChoice: academies.length > 1 && (!chosen || !academies.some((a) => a.slug === chosen)),
  });
}
