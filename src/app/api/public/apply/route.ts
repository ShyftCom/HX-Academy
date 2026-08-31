import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { screenSurveyAnswers } from "@/lib/survey-screening";

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
});

// Documents are deliberately not accepted here. The public form only creates a
// lead; files are uploaded by the player once the account exists, so this
// unauthenticated endpoint no longer takes arbitrary file URLs.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

    const data = parsed.data;

    // Screened again here, not only at the survey step. The step-level check
    // is a redirect the browser performs; this one is what actually keeps a
    // disqualified applicant out of the pipeline, since nothing stops a caller
    // from posting straight to this route.
    if (data.surveyAnswers?.length) {
      const { disqualified } = await screenSurveyAnswers(data.surveyAnswers);
      if (disqualified) {
        return NextResponse.json({ success: false, disqualified: true }, { status: 200 });
      }
    }

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

    // The lead and its survey answers are one submission, not two writes: a
    // bad questionId/surveyId used to leave the lead behind with no answers
    // attached while the caller still saw a 500, and the phone/email was then
    // stuck — any real resubmission got refused as a duplicate against the
    // orphaned row. Wrapping both in a transaction means a failed answer
    // insert rolls the lead back too, so "submission failed" actually means
    // nothing was saved.
    const lead = await db.$transaction(async (tx) => {
      const created = await tx.lead.create({
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
        await tx.surveyAnswer.createMany({
          data: data.surveyAnswers.map((a) => ({
            leadId: created.id,
            questionId: a.questionId,
            surveyId: a.surveyId ?? "",
            answer: a.answer,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
