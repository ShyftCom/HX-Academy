import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const station = await db.station.findUnique({
    where: { id },
    include: {
      stationStaff: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { players: true, leads: true, meetings: true } },
    },
  });
  if (!station) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(station);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const station = await db.station.update({
    where: { id },
    data: {
      name: body.name,
      nameFr: body.nameFr, nameAr: body.nameAr,
      wilaya: body.wilaya,
      wilayaCode: body.wilayaCode ? Number(body.wilayaCode) : undefined,
      address: body.address,
      phone: body.phone,
      email: body.email,
      whatsapp: body.whatsapp,
      logoUrl: body.logoUrl,
      status: body.status,
      // ---- Showcase Website: Venue marketing fields (additive) ----
      slug: body.slug !== undefined ? body.slug || null : undefined,
      heroImageUrl: body.heroImageUrl,
      galleryImages: body.galleryImages !== undefined ? JSON.stringify(body.galleryImages ?? []) : undefined,
      shortDescription: body.shortDescription, shortDescriptionFr: body.shortDescriptionFr, shortDescriptionAr: body.shortDescriptionAr,
      fullDescription: body.fullDescription, fullDescriptionFr: body.fullDescriptionFr, fullDescriptionAr: body.fullDescriptionAr,
      facilities: body.facilities !== undefined ? JSON.stringify(body.facilities ?? []) : undefined,
      facilitiesFr: body.facilitiesFr !== undefined ? JSON.stringify(body.facilitiesFr ?? []) : undefined,
      facilitiesAr: body.facilitiesAr !== undefined ? JSON.stringify(body.facilitiesAr ?? []) : undefined,
      pitchType: body.pitchType,
      changingRooms: body.changingRooms,
      parkingInfo: body.parkingInfo, parkingInfoFr: body.parkingInfoFr, parkingInfoAr: body.parkingInfoAr,
      transportInfo: body.transportInfo, transportInfoFr: body.transportInfoFr, transportInfoAr: body.transportInfoAr,
      accessibilityInfo: body.accessibilityInfo, accessibilityInfoFr: body.accessibilityInfoFr, accessibilityInfoAr: body.accessibilityInfoAr,
      googleMapsUrl: body.googleMapsUrl,
      latitude: body.latitude !== undefined ? (body.latitude === null ? null : Number(body.latitude)) : undefined,
      longitude: body.longitude !== undefined ? (body.longitude === null ? null : Number(body.longitude)) : undefined,
      displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : undefined,
      isPubliclyListed: body.isPubliclyListed,
    },
  });
  return NextResponse.json(station);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.station.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
