import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { isHoneypotTripped, isRateLimited } from "@/lib/public-form-guard";

const schema = z.object({
  parentFirstName: z.string().min(1),
  parentLastName: z.string().min(1),
  parentEmail: z.string().email(),
  parentPhone: z.string().min(1),
  playerFirstName: z.string().min(1),
  playerLastName: z.string().min(1),
  playerDateOfBirth: z.string().optional(),
  ageGroup: z.string().optional(),
  gender: z.string().optional(),
  preferredStationId: z.string().optional(),
  currentPlayingLevel: z.string().optional(),
  currentClub: z.string().optional(),
  medicalNotes: z.string().optional(),
  message: z.string().optional(),
  privacyConsent: z.boolean(),
  marketingConsent: z.boolean().optional(),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    const data = parsed.data;

    if (isHoneypotTripped(data.website)) return NextResponse.json({ success: true, leadId: "ok" });
    if (!data.privacyConsent) return NextResponse.json({ error: "Privacy consent is required" }, { status: 400 });

    const existing = await db.lead.findFirst({ where: { phone: data.parentPhone, leadType: "squad_registration", isConverted: false } });
    if (existing) return NextResponse.json({ error: "duplicate", message: "A registration already exists with this phone number" }, { status: 409 });

    if (await isRateLimited({ leadType: "squad_registration", identifier: data.parentPhone })) {
      return NextResponse.json({ error: "Too many requests, please try again later" }, { status: 429 });
    }

    const defaultStatus = (await db.leadStatus.findFirst({ where: { isDefault: true } })) ?? (await db.leadStatus.findFirst({ orderBy: { order: "asc" } }));

    const lead = await db.lead.create({
      data: {
        fullName: `${data.playerFirstName} ${data.playerLastName}`.trim(),
        phone: data.parentPhone,
        email: data.parentEmail,
        dateOfBirth: data.playerDateOfBirth ? new Date(data.playerDateOfBirth) : null,
        parentName: `${data.parentFirstName} ${data.parentLastName}`.trim(),
        parentPhone: data.parentPhone,
        categoryInterest: data.ageGroup ?? null,
        notes: data.message ?? null,
        source: "website_squad_registration",
        leadType: "squad_registration",
        stationId: data.preferredStationId || null,
        statusId: defaultStatus?.id ?? null,
        extraData: JSON.stringify({
          gender: data.gender ?? null,
          currentPlayingLevel: data.currentPlayingLevel ?? null,
          currentClub: data.currentClub ?? null,
          medicalNotes: data.medicalNotes ?? null,
          marketingConsent: !!data.marketingConsent,
        }),
      },
    });

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
