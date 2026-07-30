import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public, unauthenticated: powers the header location selector and the
// /venues listing page. Deliberately selects only public-safe marketing
// fields off Station — never phone/email/whatsapp or any internal relation.
export async function GET() {
  const venues = await db.station.findMany({
    where: { status: "active", isPubliclyListed: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      wilaya: true,
      address: true,
      heroImageUrl: true,
      shortDescription: true,
      shortDescriptionFr: true,
      shortDescriptionAr: true,
      logoUrl: true,
    },
  });

  return NextResponse.json(venues);
}
