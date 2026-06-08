import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings, getSetting } from "@/lib/settings";

export async function GET() {
  try {
    const allSettings = await db.setting.findMany();
    const settings: Record<string, string> = {};
    for (const s of allSettings) {
      if (s.key.startsWith("lp_") || s.key === "academy_name" || s.key === "currency_symbol") {
        settings[s.key] = s.value;
      }
    }

    const landingPage = await db.landingPage.findFirst({
      include: { sections: { where: { isEnabled: true }, orderBy: { order: "asc" } } },
    });

    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    const activeSurveyId = settings["lp_active_survey_id"] ?? "";
    let survey = null;
    if (activeSurveyId) {
      const raw = await db.survey.findUnique({
        where: { id: activeSurveyId },
        include: { questions: { orderBy: { order: "asc" } } },
      });
      if (raw) {
        survey = {
          ...raw,
          questions: raw.questions.map((q) => ({
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
      academyName: settings["academy_name"] ?? "HX Academy",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load landing page data" }, { status: 500 });
  }
}
