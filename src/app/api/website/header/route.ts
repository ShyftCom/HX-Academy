import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const stationId = req.nextUrl.searchParams.get("station_id") ?? null;

  const header = await db.websiteHeaderConfig.findFirst({
    where: stationId ? { stationId } : { stationId: null },
    include: {
      navItems: {
        where: { isActive: true },
        orderBy: { position: "asc" },
        include: {
          dropdownItems: { where: { isActive: true }, orderBy: { position: "asc" } },
        },
      },
    },
  });

  return NextResponse.json(header ?? {});
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { stationId, branding, navItems, cta, options } = body;

  const existing = await db.websiteHeaderConfig.findFirst({
    where: stationId ? { stationId } : { stationId: null },
  });

  const headerData = {
    stationId: stationId ?? null,
    logoUrl: branding?.logoUrl ?? null,
    backgroundColor: branding?.backgroundColor ?? "#ffffff",
    textColor: branding?.textColor ?? "#0a1628",
    accentColor: branding?.accentColor ?? "#0a1628",
    sticky: branding?.sticky ?? true,
    showLanguageSwitcher: options?.showLanguageSwitcher ?? true,
    ctaLabel: cta?.label ?? null,
    ctaLabelFr: cta?.labelFr ?? null,
    ctaLabelAr: cta?.labelAr ?? null,
    ctaUrl: cta?.url ?? null,
    ctaStyle: cta?.style ?? "filled",
  };

  let header: { id: string };
  if (existing) {
    header = await db.websiteHeaderConfig.update({ where: { id: existing.id }, data: headerData });
    await db.headerNavItem.deleteMany({ where: { headerId: existing.id } });
  } else {
    header = await db.websiteHeaderConfig.create({ data: headerData });
  }

  if (Array.isArray(navItems)) {
    for (const item of navItems) {
      const navItem = await db.headerNavItem.create({
        data: {
          headerId: header.id,
          label: item.label,
          labelFr: item.labelFr ?? null,
          labelAr: item.labelAr ?? null,
          url: item.url ?? null,
          hasDropdown: item.hasDropdown ?? false,
          position: item.position ?? 0,
          isActive: item.isActive ?? true,
        },
      });
      if (item.hasDropdown && Array.isArray(item.dropdownItems)) {
        await db.headerNavDropdownItem.createMany({
          data: item.dropdownItems.map((d: {
            label: string; labelFr?: string; labelAr?: string; url: string;
            icon?: string; description?: string; descriptionFr?: string; descriptionAr?: string;
            position?: number; isActive?: boolean;
          }) => ({
            navItemId: navItem.id,
            label: d.label,
            labelFr: d.labelFr ?? null,
            labelAr: d.labelAr ?? null,
            url: d.url,
            icon: d.icon ?? null,
            description: d.description ?? null,
            descriptionFr: d.descriptionFr ?? null,
            descriptionAr: d.descriptionAr ?? null,
            position: d.position ?? 0,
            isActive: d.isActive ?? true,
          })),
        });
      }
    }
  }

  const updated = await db.websiteHeaderConfig.findUnique({
    where: { id: header.id },
    include: {
      navItems: {
        orderBy: { position: "asc" },
        include: { dropdownItems: { orderBy: { position: "asc" } } },
      },
    },
  });

  return NextResponse.json(updated);
}
