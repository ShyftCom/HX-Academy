import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { isHoneypotTripped, isRateLimited } from "@/lib/public-form-guard";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().min(1),
  enquiryType: z.string().optional(),
  programmeId: z.string().optional(),
  stationId: z.string().optional(),
  message: z.string().min(1),
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

    if (await isRateLimited({ leadType: "contact", identifier: data.email, windowMinutes: 30, max: 5 })) {
      return NextResponse.json({ error: "Too many requests, please try again later" }, { status: 429 });
    }

    const defaultStatus = (await db.leadStatus.findFirst({ where: { isDefault: true } })) ?? (await db.leadStatus.findFirst({ orderBy: { order: "asc" } }));

    const lead = await db.lead.create({
      data: {
        fullName: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
        phone: data.phone || null,
        categoryInterest: data.enquiryType || data.subject,
        notes: data.message,
        source: "website_contact",
        leadType: "contact",
        programmeId: data.programmeId || null,
        stationId: data.stationId || null,
        statusId: defaultStatus?.id ?? null,
        extraData: JSON.stringify({ subject: data.subject, marketingConsent: !!data.marketingConsent }),
      },
    });

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
