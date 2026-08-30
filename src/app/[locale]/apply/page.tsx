"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, CheckCircle2 } from "lucide-react";

/**
 * Public application form — a *lead* form, nothing more.
 *
 * It collects the survey the Super Admin configured and the applicant's own
 * details, and stops there. Choosing a subscription plan, paying for it and
 * uploading documents all used to live in this same wizard, which asked a
 * stranger to pick a plan and hand over an ID card before anyone had spoken to
 * them. Those steps now happen in the player portal, after an admin has closed
 * the lead and created the account.
 */
function ApplyFormInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations("apply");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  /**
   * Set when the visitor arrived from a plan card. Never shown — it rides
   * along on the lead purely so the sales team can see what caught their eye.
   */
  const planParam = searchParams.get("plan");

  const [step, setStep] = useState(0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", dateOfBirth: "", parentName: "", parentPhone: "", address: "", categoryInterest: "" });
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string | string[]>>({});

  useEffect(() => {
    fetch("/api/public/landing")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const survey = data?.survey;
  const hasSurvey = Boolean(survey?.questions?.length);

  /** Step ids; visible labels come from apply.steps.<id>. The survey step is dropped when none is configured. */
  const STEPS: readonly string[] = hasSurvey ? ["survey", "info", "review"] : ["info", "review"];
  const current = STEPS[step];
  const lastStep = STEPS.length - 1;

  const setField = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  function validateStep(): boolean {
    if (current === "survey") {
      for (const q of survey.questions) {
        // The question text itself is admin-authored and has no per-locale
        // column; only the surrounding sentence is translated.
        const answer = surveyAnswers[q.id];
        const answered = Array.isArray(answer) ? answer.length > 0 : Boolean(answer?.toString().trim());
        if (q.isRequired && !answered) { toast.error(tErr("documentsRequired", { items: q.question })); return false; }
      }
    }
    if (current === "info") {
      if (!form.fullName.trim()) { toast.error(tErr("participantNameRequired")); return false; }
      if (!form.phone.trim()) { toast.error(tErr("guardianPhoneRequired")); return false; }
    }
    return true;
  }

  function next() { if (validateStep()) setStep((p) => Math.min(p + 1, lastStep)); }
  function back() { setStep((p) => Math.max(p - 1, 0)); }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body: any = {
        fullName: form.fullName,
        phone: form.phone || undefined,
        email: form.email || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        parentName: form.parentName || undefined,
        parentPhone: form.parentPhone || undefined,
        address: form.address || undefined,
        categoryInterest: form.categoryInterest || undefined,
        selectedPlanId: planParam ?? undefined,
        surveyAnswers: Object.entries(surveyAnswers)
          .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : v.toString().trim()))
          .map(([questionId, answer]) => ({
            questionId,
            surveyId: survey?.id,
            answer: Array.isArray(answer) ? JSON.stringify(answer) : String(answer),
          })),
      };

      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) { toast.error(tErr("duplicateApplication")); return; }
      if (!res.ok) { toast.error(tErr("submissionFailed")); return; }

      window.fbq?.("track", "Lead");
      setSubmitted(true);
    } catch {
      toast.error(tErr("generic"));
    } finally {
      setSubmitting(false);
    }
  }

  function renderSurveyQuestion(q: any) {
    const val = surveyAnswers[q.id];
    const set = (v: string | string[]) => setSurveyAnswers((p) => ({ ...p, [q.id]: v }));
    const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent";

    switch (q.questionType) {
      case "textarea": return <textarea rows={3} className={inputClass} value={String(val ?? "")} onChange={(e) => set(e.target.value)} placeholder={q.question} />;
      case "select": return (
        <select className={inputClass} value={String(val ?? "")} onChange={(e) => set(e.target.value)}>
          <option value="">{t("selectOption")}</option>
          {(q.options ?? []).map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      case "radio": return (
        <div className="space-y-2">
          {(q.options ?? []).map((o: string) => (
            <label key={o} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${val === o ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"}`}>
              <input type="radio" name={q.id} value={o} checked={val === o} onChange={() => set(o)} className="text-green-600" />
              <span className="text-sm text-gray-800 dark:text-gray-200">{o}</span>
            </label>
          ))}
        </div>
      );
      case "checkbox": {
        const arr = Array.isArray(val) ? val : [];
        return (
          <div className="space-y-2">
            {(q.options ?? []).map((o: string) => (
              <label key={o} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={arr.includes(o)} onChange={(e) => set(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} className="text-green-600 rounded" />
                <span className="text-sm text-gray-800 dark:text-gray-200">{o}</span>
              </label>
            ))}
          </div>
        );
      }
      case "date": return <input type="date" className={inputClass} value={String(val ?? "")} onChange={(e) => set(e.target.value)} />;
      case "number": return <input type="number" className={inputClass} value={String(val ?? "")} onChange={(e) => set(e.target.value)} placeholder={q.question} />;
      case "email": return <input type="email" className={inputClass} value={String(val ?? "")} onChange={(e) => set(e.target.value)} placeholder={q.question} />;
      case "phone": return <input type="tel" className={inputClass} value={String(val ?? "")} onChange={(e) => set(e.target.value)} placeholder={q.question} />;
      default: return <input type="text" className={inputClass} value={String(val ?? "")} onChange={(e) => set(e.target.value)} placeholder={q.question} />;
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-green-600" />
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t("doneTitle")}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-2">{t("doneThanks", { name: form.fullName })}</p>
        <p className="text-gray-500 dark:text-gray-400 mb-2">{t("doneBody", { contact: form.phone || form.email })}</p>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{t("doneNext")}</p>
        <Link href={`/${locale}`} className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors">
          <ArrowLeft className="ob-flip-rtl w-4 h-4" /> {t("backToHome")}
        </Link>
      </motion.div>
    </div>
  );

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gray-900 dark:bg-gray-950 text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center font-bold text-xs">FSA</div>
            <span className="font-semibold">{tc("brand")}</span>
          </Link>
          <span className="text-sm text-gray-400">{t("title")}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center">
            {STEPS.map((id, i) => (
              <div key={id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${i < step ? "bg-green-600 text-white" : i === step ? "bg-green-600 text-white ring-4 ring-green-100 dark:ring-green-900" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:block whitespace-nowrap ${i === step ? "text-gray-900 dark:text-white font-semibold" : "text-gray-400 dark:text-gray-500"}`}>{t(`steps.${id}`)}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${i < step ? "bg-green-600" : "bg-gray-200 dark:bg-gray-700"}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

            {/* Survey configured by the Super Admin */}
            {current === "survey" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{survey.title || t("surveyHeading")}</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">{survey.description || t("surveyBody")}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                  {survey.questions.map((q: any) => (
                    <div key={q.id}>
                      <label className={labelClass}>{q.question} {q.isRequired && <span className="text-red-500">*</span>}</label>
                      {renderSurveyQuestion(q)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personal info */}
            {current === "info" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("personalHeading")}</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">{t("personalBody")}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>{t("fullName")} <span className="text-red-500">*</span></label>
                      <input type="text" className={inputClass} value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} placeholder={t("fullNamePlaceholder")} />
                    </div>
                    <div>
                      <label className={labelClass}>{t("phone")} <span className="text-red-500">*</span></label>
                      <input type="tel" className={inputClass} value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+213 000 000 000" />
                    </div>
                    <div>
                      <label className={labelClass}>{t("email")}</label>
                      <input type="email" className={inputClass} value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder={t("emailPlaceholder")} />
                    </div>
                    <div>
                      <label className={labelClass}>{t("dateOfBirth")}</label>
                      <input type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>{t("category")}</label>
                      <select className={inputClass} value={form.categoryInterest} onChange={(e) => setField("categoryInterest", e.target.value)}>
                        <option value="">{t("categoryPlaceholder")}</option>
                        {["U8", "U10", "U12", "U14", "U16", "U18", "Senior"].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>{t("parentName")}</label>
                      <input type="text" className={inputClass} value={form.parentName} onChange={(e) => setField("parentName", e.target.value)} placeholder={t("parentNamePlaceholder")} />
                    </div>
                    <div>
                      <label className={labelClass}>{t("parentPhone")}</label>
                      <input type="tel" className={inputClass} value={form.parentPhone} onChange={(e) => setField("parentPhone", e.target.value)} placeholder="+213 000 000 000" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>{t("address")}</label>
                      <input type="text" className={inputClass} value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder={t("addressPlaceholder")} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Review */}
            {current === "review" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("reviewHeading")}</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">{t("reviewBody")}</p>
                </div>
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full" /> {t("yourInformation")}</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {([["reviewName", form.fullName], ["reviewPhone", form.phone], ["reviewEmail", form.email || "—"], ["reviewCategory", form.categoryInterest || "—"]] as const).map(([k, v]) => (
                        <div key={k}><span className="text-gray-400 dark:text-gray-500">{t(k)}:</span> <span className="text-gray-700 dark:text-gray-300 font-medium">{v}</span></div>
                      ))}
                    </div>
                  </div>
                  {Object.keys(surveyAnswers).filter((k) => surveyAnswers[k]).length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2"><div className="w-2 h-2 bg-purple-500 rounded-full" /> {t("surveyAnswers")}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t("surveyAnswered", { count: Object.keys(surveyAnswers).filter((k) => surveyAnswers[k]).length })}</p>
                    </div>
                  )}
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
                    <p className="text-sm text-green-800 dark:text-green-300">{t("nextStepsBody")}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button onClick={step === 0 ? () => router.push(`/${locale}`) : back} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-colors">
            <ArrowLeft className="ob-flip-rtl w-4 h-4" /> {step === 0 ? t("backToHome") : tc("back")}
          </button>
          {step < lastStep ? (
            <button onClick={next} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors">
              {t("continue")} <ArrowRight className="ob-flip-rtl w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("submitting")}</> : <>{t("submit")} <Check className="w-4 h-4" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    }>
      <ApplyFormInner />
    </Suspense>
  );
}
