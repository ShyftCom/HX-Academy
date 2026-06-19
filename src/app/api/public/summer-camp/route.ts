import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  // Participant
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: z.string().optional(),
  age: z.number().optional(),
  gender: z.string().optional(),
  healthNotes: z.string().optional(),
  // Guardian
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianPhone: z.string().min(1, "Guardian phone is required"),
  guardianEmail: z.string().email().optional().or(z.literal("")),
  guardianRelation: z.string().optional(),
  // Camp
  sessionId: z.string().optional(),
  stationId: z.string().optional(),
  notes: z.string().optional(),
  // Files
  files: z.array(z.object({
    requirementId: z.string().optional(),
    fileName: z.string(),
    fileUrl: z.string(),
    mimeType: z.string().optional(),
    size: z.number().optional(),
  })).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

    const data = parsed.data;

    // Check for duplicate by guardian phone
    const existing = await db.lead.findFirst({
      where: { phone: data.guardianPhone, leadType: "summer_camp", isConverted: false },
    });
    if (existing) {
      return NextResponse.json({ error: "duplicate", message: "An application already exists with this phone number" }, { status: 409 });
    }

    const defaultStatus = await db.leadStatus.findFirst({ where: { isDefault: true } })
      ?? await db.leadStatus.findFirst({ orderBy: { order: "asc" } });

    // Store camp-specific data as JSON on the lead
    const summerCampData = JSON.stringify({
      sessionId: data.sessionId ?? null,
      gender: data.gender ?? null,
      healthNotes: data.healthNotes ?? null,
      guardianRelation: data.guardianRelation ?? null,
    });

    const lead = await db.lead.create({
      data: {
        fullName: data.fullName,
        phone: data.guardianPhone,
        email: data.guardianEmail || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        age: data.age ?? null,
        parentName: data.guardianName,
        parentPhone: data.guardianPhone,
        address: null,
        notes: data.notes ?? null,
        source: "website",
        leadType: "summer_camp",
        summerCampData,
        stationId: data.stationId ?? null,
        statusId: defaultStatus?.id ?? null,
      },
    });

    if (data.files?.length) {
      await db.applicationFile.createMany({
        data: data.files.map((f) => ({
          leadId: lead.id,
          requirementId: f.requirementId ?? null,
          fileName: f.fileName,
          fileUrl: f.fileUrl,
          mimeType: f.mimeType ?? null,
          size: f.size ?? null,
        })),
      });
    }

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("station_id");

  const sessions = await db.summerCampSession.findMany({
    where: { isActive: true, ...(stationId ? { stationId } : {}) },
    orderBy: { startDate: "asc" },
  });

  const requirements = await db.fileRequirement.findMany({
    where: { isActive: true, appliesTo: { in: ["summer_camp", "both"] } },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ sessions, requirements });
}
