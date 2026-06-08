import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
  categoryInterest: z.string().optional(),
  selectedPlanId: z.string().optional(),
  surveyAnswers: z.array(z.object({ questionId: z.string(), surveyId: z.string().optional(), answer: z.string() })).optional(),
  files: z.array(z.object({ requirementId: z.string().optional(), fileName: z.string(), fileUrl: z.string(), mimeType: z.string().optional(), size: z.number().optional() })).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

    const data = parsed.data;

    if (!data.phone && !data.email) {
      return NextResponse.json({ error: "Phone or email is required" }, { status: 400 });
    }

    const orConditions: any[] = [];
    if (data.phone) orConditions.push({ phone: data.phone });
    if (data.email) orConditions.push({ email: data.email });

    const existing = await db.lead.findFirst({ where: { OR: orConditions, isConverted: false } });
    if (existing) {
      return NextResponse.json({ error: "duplicate", message: "An application already exists with this contact info" }, { status: 409 });
    }

    const defaultStatus = await db.leadStatus.findFirst({ where: { isDefault: true } })
      ?? await db.leadStatus.findFirst({ orderBy: { order: "asc" } });

    const lead = await db.lead.create({
      data: {
        fullName: data.fullName,
        phone: data.phone ?? null,
        email: data.email || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        age: data.dateOfBirth ? Math.floor((Date.now() - new Date(data.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365)) : null,
        parentName: data.parentName ?? null,
        parentPhone: data.parentPhone ?? null,
        address: data.address ?? null,
        categoryInterest: data.categoryInterest ?? null,
        source: "website",
        statusId: defaultStatus?.id ?? null,
        selectedPlanId: data.selectedPlanId ?? null,
      },
    });

    if (data.surveyAnswers?.length) {
      await db.surveyAnswer.createMany({
        data: data.surveyAnswers.map((a) => ({
          leadId: lead.id,
          questionId: a.questionId,
          surveyId: a.surveyId ?? "",
          answer: a.answer,
        })),
      });
    }

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
