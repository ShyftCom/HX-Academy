import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PLATFORMS = ["facebook", "tiktok", "google", "snapchat"] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await params;

  const existing = await db.pixelConfig.findMany({
    where: { stationId },
  });

  const configs = PLATFORMS.map((platform) => {
    const found = existing.find((c) => c.platform === platform);
    return found ?? {
      id: null,
      stationId,
      platform,
      pixelId: "",
      accessToken: "",
      useConversionApi: false,
      testEventCode: "",
      isActive: false,
    };
  });

  return NextResponse.json(configs);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await params;

  try {
    const body = await req.json();
    const { platform, pixelId, accessToken, useConversionApi, testEventCode, isActive } = body;

    if (!platform) return NextResponse.json({ error: "Platform required" }, { status: 400 });

    const config = await db.pixelConfig.upsert({
      where: { stationId_platform: { stationId, platform } },
      update: {
        pixelId: pixelId ?? null,
        accessToken: accessToken ?? null,
        useConversionApi: useConversionApi ?? false,
        testEventCode: testEventCode ?? null,
        isActive: isActive ?? false,
      },
      create: {
        stationId,
        platform,
        pixelId: pixelId ?? null,
        accessToken: accessToken ?? null,
        useConversionApi: useConversionApi ?? false,
        testEventCode: testEventCode ?? null,
        isActive: isActive ?? false,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
