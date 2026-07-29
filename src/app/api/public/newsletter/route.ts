import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { isHoneypotTripped, isRateLimited } from "@/lib/public-form-guard";

const schema = z.object({
  email: z.string().email(),
  website: z.string().optional(), // honeypot — real users never see/fill this field
  source: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    const data = parsed.data;

    if (isHoneypotTripped(data.website)) {
      // Silently succeed so bots don't learn the honeypot rejected them.
      return NextResponse.json({ success: true });
    }

    const existing = await db.lead.findFirst({ where: { email: data.email, leadType: "newsletter" } });
    if (existing) return NextResponse.json({ success: true }); // already subscribed — treat as success, not an error

    if (await isRateLimited({ leadType: "newsletter", identifier: data.email, windowMinutes: 60, max: 3 })) {
      return NextResponse.json({ error: "Too many requests, please try again later" }, { status: 429 });
    }

    const defaultStatus = (await db.leadStatus.findFirst({ where: { isDefault: true } })) ?? (await db.leadStatus.findFirst({ orderBy: { order: "asc" } }));

    await db.lead.create({
      data: {
        fullName: data.email,
        email: data.email,
        source: data.source ?? "website_footer_newsletter",
        leadType: "newsletter",
        statusId: defaultStatus?.id ?? null,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}
