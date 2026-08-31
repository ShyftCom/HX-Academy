/**
 * Setting keys shared between server routes and admin screens.
 *
 * Deliberately its own module: src/lib/settings.ts imports the Prisma client,
 * so a "use client" page cannot import a constant from there without dragging
 * the database into the browser bundle. Nothing here imports anything.
 */

/**
 * Names the survey the public application form asks, or is empty/absent when
 * the form skips the survey step. Written by the Survey Builder page, read by
 * GET /api/public/landing.
 */
export const APPLICATION_SURVEY_SETTING = "lp_active_survey_id";

/**
 * The two end pages of the public application form, both authored by a Super
 * Admin on the Survey Builder page.
 *
 * `lp_` prefixed so GET /api/public/landing publishes them, and so the
 * `<key>_<locale>` convention that route already implements gives each one an
 * Arabic variant (`lp_apply_qualified_title_ar`, …). The unsuffixed key holds
 * the French text, which is also the fallback when a locale variant is blank.
 */
export const APPLY_OUTCOME_SETTINGS = {
  qualifiedTitle: "lp_apply_qualified_title",
  qualifiedBody: "lp_apply_qualified_body",
  rejectedTitle: "lp_apply_rejected_title",
  rejectedBody: "lp_apply_rejected_body",
} as const;

/** Every outcome key, base and Arabic, for bulk reads. */
export const APPLY_OUTCOME_SETTING_KEYS: string[] = Object.values(APPLY_OUTCOME_SETTINGS).flatMap(
  (k) => [k, `${k}_ar`],
);

/** Shown when the Super Admin has not written their own text yet. */
export const APPLY_OUTCOME_DEFAULTS: Record<string, string> = {
  [APPLY_OUTCOME_SETTINGS.qualifiedTitle]: "Félicitations !",
  [APPLY_OUTCOME_SETTINGS.qualifiedBody]:
    "Votre candidature est bien enregistrée. L’un de nos experts vous appellera très prochainement — merci de rester disponible et de garder votre téléphone joignable.",
  [APPLY_OUTCOME_SETTINGS.rejectedTitle]: "Vous n’êtes pas éligible",
  [APPLY_OUTCOME_SETTINGS.rejectedBody]:
    "Merci de l’intérêt que vous portez à notre académie. D’après vos réponses, votre profil ne correspond pas aux critères d’admission actuels, et nous ne pouvons pas donner suite à votre inscription.",
  [`${APPLY_OUTCOME_SETTINGS.qualifiedTitle}_ar`]: "تهانينا!",
  [`${APPLY_OUTCOME_SETTINGS.qualifiedBody}_ar`]:
    "تم تسجيل طلبك بنجاح. سيتصل بك أحد خبرائنا قريبًا جدًا — يُرجى البقاء متاحًا وإبقاء هاتفك في متناول اليد.",
  [`${APPLY_OUTCOME_SETTINGS.rejectedTitle}_ar`]: "أنت غير مؤهل",
  [`${APPLY_OUTCOME_SETTINGS.rejectedBody}_ar`]:
    "شكرًا لاهتمامك بأكاديميتنا. بناءً على إجاباتك، لا يستوفي ملفك شروط القبول الحالية، ولا يمكننا متابعة تسجيلك.",
};
