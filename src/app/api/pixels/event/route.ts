import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fireConversionEvent } from "@/lib/pixels";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventName, stationId, userData, eventData } = body;

    if (!eventName || !stationId) {
      return NextResponse.json({ error: "eventName and stationId required" }, { status: 400 });
    }

    const configs = await db.pixelConfig.findMany({
      where: { stationId, isActive: true, useConversionApi: true },
    });

    const pixelConfigs = configs.map((c) => ({
      platform: c.platform as "facebook" | "tiktok" | "google" | "snapchat",
      pixelId: c.pixelId ?? "",
      accessToken: c.accessToken ?? undefined,
      useConversionApi: c.useConversionApi,
      testEventCode: c.testEventCode ?? undefined,
    }));

    await fireConversionEvent(eventName, userData ?? {}, eventData ?? {}, pixelConfigs);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Event fire failed" }, { status: 500 });
  }
}
