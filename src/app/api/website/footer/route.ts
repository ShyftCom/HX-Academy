import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const stationId = req.nextUrl.searchParams.get("station_id") ?? null;

  const footer = await db.websiteFooterConfig.findFirst({
    where: stationId ? { stationId } : { stationId: null },
    include: {
      linkColumns: {
        orderBy: { position: "asc" },
        include: { links: { where: { isActive: true }, orderBy: { position: "asc" } } },
      },
      socialLinks: { where: { isActive: true }, orderBy: { position: "asc" } },
      bottomLinks: { orderBy: { position: "asc" } },
    },
  });

  return NextResponse.json(footer ?? {});
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { stationId, appearance, socialLinks, linkColumns, bottomLinks } = body;

  const existing = await db.websiteFooterConfig.findFirst({
    where: stationId ? { stationId } : { stationId: null },
  });

  const footerData = {
    backgroundColor: appearance?.backgroundColor ?? "#0a1628",
    textColor: appearance?.textColor ?? "#ffffff",
    accentColor: appearance?.accentColor ?? "#1da1f2",
    logoUrl: appearance?.logoUrl ?? null,
    tagline: appearance?.tagline ?? null,
    taglineFr: appearance?.taglineFr ?? null,
    taglineAr: appearance?.taglineAr ?? null,
    copyrightText: appearance?.copyrightText ?? "© 2026 Football Skills Academy. All rights reserved.",
    showTrustpilot: appearance?.showTrustpilot ?? false,
    trustpilotUrl: appearance?.trustpilotUrl ?? null,
    stationId: stationId ?? null,
  };

  let footer: { id: string };
  if (existing) {
    footer = await db.websiteFooterConfig.update({ where: { id: existing.id }, data: footerData });
    await db.footerSocialLink.deleteMany({ where: { footerId: existing.id } });
    await db.footerLinkColumn.deleteMany({ where: { footerId: existing.id } });
    await db.footerBottomLink.deleteMany({ where: { footerId: existing.id } });
  } else {
    footer = await db.websiteFooterConfig.create({ data: footerData });
  }

  if (Array.isArray(socialLinks)) {
    await db.footerSocialLink.createMany({
      data: socialLinks.map((s: { platform: string; url: string; isActive: boolean; position: number }) => ({
        footerId: footer.id,
        platform: s.platform,
        url: s.url,
        isActive: s.isActive ?? true,
        position: s.position ?? 0,
      })),
    });
  }

  if (Array.isArray(linkColumns)) {
    for (const col of linkColumns) {
      const column = await db.footerLinkColumn.create({
        data: {
          footerId: footer.id,
          title: col.title,
          titleFr: col.titleFr ?? null,
          titleAr: col.titleAr ?? null,
          position: col.position ?? 0,
        },
      });
      if (Array.isArray(col.links)) {
        await db.footerLink.createMany({
          data: col.links.map((l: { label: string; labelFr?: string; labelAr?: string; url: string; openInNewTab?: boolean; position?: number; isActive?: boolean }) => ({
            columnId: column.id,
            label: l.label,
            labelFr: l.labelFr ?? null,
            labelAr: l.labelAr ?? null,
            url: l.url,
            openInNewTab: l.openInNewTab ?? false,
            position: l.position ?? 0,
            isActive: l.isActive ?? true,
          })),
        });
      }
    }
  }

  if (Array.isArray(bottomLinks)) {
    await db.footerBottomLink.createMany({
      data: bottomLinks.map((l: { label: string; labelFr?: string; labelAr?: string; url: string; position?: number }) => ({
        footerId: footer.id,
        label: l.label,
        labelFr: l.labelFr ?? null,
        labelAr: l.labelAr ?? null,
        url: l.url,
        position: l.position ?? 0,
      })),
    });
  }

  const updated = await db.websiteFooterConfig.findUnique({
    where: { id: footer.id },
    include: {
      linkColumns: { orderBy: { position: "asc" }, include: { links: { orderBy: { position: "asc" } } } },
      socialLinks: { orderBy: { position: "asc" } },
      bottomLinks: { orderBy: { position: "asc" } },
    },
  });

  return NextResponse.json(updated);
}
