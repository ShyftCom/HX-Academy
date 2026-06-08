"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Upload, Loader2, CheckCircle2, X } from "lucide-react";

function ApplyFormInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planParam = searchParams.get("plan");

  const [step, setStep] = useState(planParam ? 1 : 0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", dateOfBirth: "", parentName: "", parentPhone: "", address: "", categoryInterest: "" });
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string | string[]>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { fileName: string; fileUrl: string; mimeType?: string; size?: number }>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/public/landing")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (planParam) {
          const plan = d.plans?.find((p: any) => p.id === planParam);
          if (plan) setSelectedPlan(plan);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [planParam]);

  const STEPS = ["Choose Plan", "Information", "Documents", "Review"];
  const plans = data?.plans ?? [];
  const survey = data?.survey;
  const fileReqs = data?.fileRequirements ?? [];
  const currencySymbol = data?.settings?.currency_symbol ?? "DZD";

  const setField = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  async function handleFileUpload(reqId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading((p) => ({ ...p, [reqId]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "applications");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) {
        setUploadedFiles((p) => ({ ...p, [reqId]: { fileName: file.name, fileUrl: d.url, mimeType: file.type, size: file.size } }));
      } else {
        toast.error("Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    }
    setUploading((p) => ({ ...p, [reqId]: false }));
  }

  function removeFile(reqId: string) {
    setUploadedFiles((p) => { const n = { ...p }; delete n[reqId]; return n; });
  }

  function validateStep(): boolean {
    if (step === 0 && !selectedPlan) { toast.error("Please select a plan"); return false; }
    if (step === 1) {
      if (!form.fullName.trim()) { toast.error("Full name is required"); return false; }
      if (!form.phone.trim()) { toast.error("Phone number is required"); return false; }
      if (survey) {
        for (const q of survey.questions) {
          if (q.isRequired && !surveyAnswers[q.id]) { toast.error(`"${q.question}" is required`); return false; }
        }
      }
    }
    if (step === 2) {
      const missing = fileReqs.filter((r: any) => r.isRequired && !uploadedFiles[r.id]);
      if (missing.length > 0) { toast.error(`Please upload: ${missing.map((r: any) => r.title).join(", ")}`); return false; }
    }
    return true;
  }

  function next() { if (validateStep()) setStep((p) => Math.min(p + 1, 3)); }
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
        selectedPlanId: selectedPlan?.id,
        surveyAnswers: Object.entries(surveyAnswers)
          .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : v.toString().trim()))
          .map(([questionId, answer]) => ({
            questionId,
            surveyId: survey?.id,
            answer: Array.isArray(answer) ? JSON.stringify(answer) : String(answer),
          })),
        files: Object.entries(uploadedFiles).map(([requirementId, f]) => ({
          requirementId,
          fileName: f.fileName,
          fileUrl: f.fileUrl,
          mimeType: f.mimeType,
          size: f.size,
        })),
      };

      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const resp = await res.json();

      if (res.status === 409) { toast.error(resp.message ?? "An application already exists with this contact info"); return; }
      if (!res.ok) { toast.error("Submission failed. Please try again."); return; }

      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderSurveyQuestion(q: any) {
    const val = surveyAnswers[q.id];
    const set = (v: string | string[]) => setSurveyAnswers((p) => ({ ...p, [q.id]: v }));
    const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent";

    switch (q.questionType) {
      case "textarea": return <textarea rows={3} className={inputClass} value={String(val ?? "")} onChange={(e) => set(e.target.value)} placeholder={q.question} />;
      case "select": return (
        <select className={inputClass} value={String(val ?? "")} onChange={(e) => set(e.target.value)}>
          <option value="">Select an option</option>
          {(q.options ?? []).map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      case "radio": return (
        <div className="space-y-2">
          {(q.options ?? []).map((o: string) => (
            <label key={o} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${val === o ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
              <input type="radio" name={q.id} value={o} checked={val === o} onChange={() => set(o)} className="text-green-600" />
              <span className="text-sm">{o}</span>
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
                <span className="text-sm">{o}</span>
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-green-600" />
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted!</h2>
        <p className="text-gray-500 mb-2">Thank you, <span className="font-semibold text-gray-700">{form.fullName}</span>!</p>
        <p className="text-gray-500 mb-8">We&apos;ll review your application and contact you soon at <span className="font-semibold">{form.phone || form.email}</span>.</p>
        <Link href="/" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </motion.div>
    </div>
  );

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center font-bold text-sm">HX</div>
            <span className="font-semibold">HX Academy</span>
          </Link>
          <span className="text-sm text-gray-400">Application Form</span>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${i < step ? "bg-green-600 text-white" : i === step ? "bg-green-600 text-white ring-4 ring-green-100" : "bg-gray-200 text-gray-500"}`}>
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:block whitespace-nowrap ${i === step ? "text-gray-900 font-semibold" : "text-gray-400"}`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${i < step ? "bg-green-600" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

            {/* STEP 0: Choose Plan */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
                <p className="text-gray-500">Select the subscription plan that best suits you.</p>
                <div className="grid gap-4 mt-6">
                  {plans.map((plan: any) => (
                    <div key={plan.id} onClick={() => setSelectedPlan(plan)} className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${selectedPlan?.id === plan.id ? "border-green-500 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                          <p className="text-green-600 font-semibold">{currencySymbol} {plan.price.toLocaleString()} / {plan.duration} {plan.durationType}</p>
                          {plan.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{plan.description}</p>}
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-4 ${selectedPlan?.id === plan.id ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                          {selectedPlan?.id === plan.id && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 1: Personal Info + Survey */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                  <p className="text-gray-500 mt-1">Tell us about yourself</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                      <input type="text" className={inputClass} value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} placeholder="Enter your full name" />
                    </div>
                    <div>
                      <label className={labelClass}>Phone <span className="text-red-500">*</span></label>
                      <input type="tel" className={inputClass} value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+213 000 000 000" />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input type="email" className={inputClass} value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="your@email.com" />
                    </div>
                    <div>
                      <label className={labelClass}>Date of Birth</label>
                      <input type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Category</label>
                      <select className={inputClass} value={form.categoryInterest} onChange={(e) => setField("categoryInterest", e.target.value)}>
                        <option value="">Select category</option>
                        {["U8", "U10", "U12", "U14", "U16", "U18", "Senior"].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Parent Name</label>
                      <input type="text" className={inputClass} value={form.parentName} onChange={(e) => setField("parentName", e.target.value)} placeholder="Parent or guardian name" />
                    </div>
                    <div>
                      <label className={labelClass}>Parent Phone</label>
                      <input type="tel" className={inputClass} value={form.parentPhone} onChange={(e) => setField("parentPhone", e.target.value)} placeholder="+213 000 000 000" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Address</label>
                      <input type="text" className={inputClass} value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Your address" />
                    </div>
                  </div>
                </div>

                {survey && survey.questions.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                    <h3 className="font-semibold text-gray-900">{survey.title}</h3>
                    {survey.questions.map((q: any) => (
                      <div key={q.id}>
                        <label className={labelClass}>{q.question} {q.isRequired && <span className="text-red-500">*</span>}</label>
                        {renderSurveyQuestion(q)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: File Uploads */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Required Documents</h2>
                  <p className="text-gray-500 mt-1">Upload the following documents to complete your application</p>
                </div>
                {fileReqs.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">No documents required at this time.</div>
                ) : (
                  <div className="space-y-4">
                    {fileReqs.map((req: any) => (
                      <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{req.title}</p>
                              {req.isRequired ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Required</span> : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Optional</span>}
                            </div>
                            {req.description && <p className="text-sm text-gray-500 mt-0.5">{req.description}</p>}
                            <p className="text-xs text-gray-400 mt-1">Accepted: {req.allowedTypes} · Max: {req.maxSizeMb}MB</p>
                          </div>
                          {uploadedFiles[req.id] && <Check className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />}
                        </div>
                        {uploadedFiles[req.id] ? (
                          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <span className="text-sm text-green-700 flex-1 truncate">{uploadedFiles[req.id].fileName}</span>
                            <button onClick={() => removeFile(req.id)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <input type="file" className="hidden" accept={req.allowedTypes} onChange={(e) => handleFileUpload(req.id, e)} />
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-400 hover:bg-green-50/50 transition-all">
                              {uploading[req.id] ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                              ) : (
                                <><Upload className="w-5 h-5 mx-auto text-gray-400 mb-1" /><span className="text-sm text-gray-500">Click to upload file</span></>
                              )}
                            </div>
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Review */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Review Your Application</h2>
                  <p className="text-gray-500 mt-1">Please review before submitting</p>
                </div>
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" /> Selected Plan
                    </h3>
                    <p className="text-gray-700 font-medium">{selectedPlan?.name}</p>
                    <p className="text-green-600 text-sm">{currencySymbol} {selectedPlan?.price?.toLocaleString()} / {selectedPlan?.duration} {selectedPlan?.durationType}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full" /> Your Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[["Name", form.fullName], ["Phone", form.phone], ["Email", form.email || "—"], ["Category", form.categoryInterest || "—"]].map(([k, v]) => (
                        <div key={k}><span className="text-gray-400">{k}:</span> <span className="text-gray-700 font-medium">{v}</span></div>
                      ))}
                    </div>
                  </div>
                  {Object.keys(uploadedFiles).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><div className="w-2 h-2 bg-yellow-500 rounded-full" /> Uploaded Documents ({Object.keys(uploadedFiles).length})</h3>
                      <div className="space-y-1">
                        {Object.values(uploadedFiles).map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-green-500" />{f.fileName}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.keys(surveyAnswers).filter((k) => surveyAnswers[k]).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><div className="w-2 h-2 bg-purple-500 rounded-full" /> Survey Answers</h3>
                      <p className="text-sm text-gray-500">{Object.keys(surveyAnswers).filter((k) => surveyAnswers[k]).length} question(s) answered</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button onClick={step === 0 ? () => router.push("/") : back} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> {step === 0 ? "Back to Home" : "Back"}
          </button>
          {step < 3 ? (
            <button onClick={next} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors">
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <>Submit Application <Check className="w-4 h-4" /></>}
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    }>
      <ApplyFormInner />
    </Suspense>
  );
}
