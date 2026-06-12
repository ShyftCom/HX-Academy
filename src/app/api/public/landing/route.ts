import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const locale = req.nextUrl.searchParams.get("locale") ?? "fr";
    const allSettings = await db.setting.findMany();
    const raw: Record<string, string> = {};
    for (const s of allSettings) raw[s.key] = s.value;

    const settings: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (key.startsWith("lp_") || key === "academy_name" || key === "currency_symbol") {
        settings[key] = value;
      }
    }

    if (locale !== "fr") {
      for (const [key, value] of Object.entries(raw)) {
        if (key.endsWith(`_${locale}`)) {
          const base = key.slice(0, key.length - locale.length - 1);
          if (value) settings[base] = value;
        }
      }
    }

    const landingPage = await db.landingPage.findFirst({
      include: { sections: { where: { isEnabled: true }, orderBy: { order: "asc" } } },
    });

    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    const activeSurveyId = raw["lp_active_survey_id"] ?? "";
    let survey = null;
    if (activeSurveyId) {
      const rawSurvey = await db.survey.findUnique({
        where: { id: activeSurveyId },
        include: { questions: { orderBy: { order: "asc" } } },
      });
      if (rawSurvey) {
        survey = {
          ...rawSurvey,
          questions: rawSurvey.questions.map((q) => ({
            ...q,
            options: (() => { try { return JSON.parse(q.options ?? "[]"); } catch { return []; } })(),
          })),
        };
      }
    }

    const fileRequirements = await db.fileRequirement.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({
      settings,
      sections: landingPage?.sections ?? [],
      plans,
      survey,
      fileRequirements,
      academyName: settings["academy_name"] ?? "Foot-Ball Skills Academy",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load landing page data" }, { status: 500 });
  }
}
