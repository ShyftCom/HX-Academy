import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { screenSurveyAnswers } from "@/lib/survey-screening";

const schema = z.object({
  answers: z.array(z.object({ questionId: z.string(), answer: z.string() })).default([]),
});

/**
 * Screens the survey answers before the applicant reaches the details step.
 *
 * The form asks here rather than deciding for itself because the options a
 * Super Admin marked as disqualifying are never published to the browser —
 * otherwise a visitor could read them out of the page and pick around them.
 * POST /api/public/apply screens again on submit; this route only exists so a
 * disqualified visitor is turned away before filling anything in.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

    const { disqualified } = await screenSurveyAnswers(parsed.data.answers);
    return NextResponse.json({ disqualified });
  } catch (error) {
    console.error(error);
    // Screening is a gate, not a guard: on an error let the applicant through
    // to the next step. The submit route runs the same check and is the one
    // that actually decides whether a lead exists.
    return NextResponse.json({ disqualified: false });
  }
}
