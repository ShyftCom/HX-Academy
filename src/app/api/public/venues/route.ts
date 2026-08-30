import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wilayaLabel, wilayaNames } from "@/lib/public-wilaya";

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
      nameFr: true,
      nameAr: true,
      wilaya: true,
      wilayaCode: true,
      address: true,
      heroImageUrl: true,
      shortDescription: true,
      shortDescriptionFr: true,
      shortDescriptionAr: true,
      logoUrl: true,
    },
  });

  // The header's location selector is a client component with no database
  // access, so the province is resolved to both languages here rather than
  // shipping the raw typed string for it to print untranslated.
  const names = await wilayaNames();
  return NextResponse.json(
    venues.map((v) => ({
      ...v,
      wilayaFr: wilayaLabel(names, v, "fr"),
      wilayaAr: wilayaLabel(names, v, "ar"),
    }))
  );
}
