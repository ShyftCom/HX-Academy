"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Sun, Check, ArrowRight, ChevronDown, X, Upload, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SCPlan {
  id: string; name: string; programTrack: string | null; price: number; description: string | null;
}
interface Session { id: string; name: string; startDate: string; endDate: string; price?: number }
interface FileReq { id: string; title: string; description?: string; isRequired: boolean; allowedTypes: string; maxSizeMb: number }

const STEPS = ["Choose Plan", "Information", "Documents", "Review"];

export default function SummerCampLandingPage() {
  const { locale } = useParams<{ locale: string }>();
  const isRtl = locale === "ar";

  const [data, setData] = useState<{ sessions: Session[]; plans: SCPlan[]; requirements: FileReq[]; settings: Record<string, string> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [selectedPlan, setSelectedPlan] = useState<SCPlan | null>(null);
  const [form, setForm] = useState({
    fullName: "", dateOfBirth: "", age: "", gender: "", healthNotes: "", notes: "",
    guardianName: "", guardianPhone: "", guardianEmail: "", guardianRelation: "parent", sessionId: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { fileName: string; fileUrl: string; mimeType?: string; size?: number }>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch("/api/public/summer-camp")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleFileUpload(reqId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading((p) => ({ ...p, [reqId]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "summer-camp");
      const res = await fetch("/api/public/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) setUploadedFiles((p) => ({ ...p, [reqId]: { fileName: file.name, fileUrl: d.url, mimeType: file.type, size: file.size } }));
      else toast.error(d.error ?? "Upload failed");
    } catch { toast.error("Upload failed"); }
    setUploading((p) => ({ ...p, [reqId]: false }));
  }

  function validateStep(): boolean {
    if (step === 0 && !selectedPlan) { toast.error("Please select a plan"); return false; }
    if (step === 1) {
      if (!form.fullName.trim()) { toast.error("Participant name is required"); return false; }
      if (!form.guardianName.trim()) { toast.error("Guardian name is required"); return false; }
      if (!form.guardianPhone.trim()) { toast.error("Guardian phone is required"); return false; }
    }
    if (step === 2) {
      const missing = (data?.requirements ?? []).filter((r) => r.isRequired && !uploadedFiles[r.id]);
      if (missing.length > 0) { toast.error(`Please upload: ${missing.map((r) => r.title).join(", ")}`); return false; }
    }
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const files = Object.entries(uploadedFiles).map(([reqId, f]) => ({ requirementId: reqId, ...f }));
      const res = await fetch("/api/public/summer-camp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, age: form.age ? parseInt(form.age) : undefined, stationId: undefined, selectedPlanId: selectedPlan?.id, files }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.error === "duplicate") toast.error("An application already exists with this phone number.");
        else toast.error(d.message ?? "Submission failed");
        return;
      }
      setSubmitted(true);
    } catch { toast.error("Submission failed"); }
    setSubmitting(false);
  }

  const s = data?.settings ?? {};
  const pageTitle = s.sc_page_title || "Summer Camp";
  const heroImage = s.sc_page_hero_image || null;
  const description = s.sc_page_description || "Join our summer camp program and develop your football skills in a fun, safe environment.";
  const ctaLabel = s.sc_page_cta_label || "Register Now";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950" dir={isRtl ? "rtl" : "ltr"}>
      {/* HERO */}
      <section className="relative flex items-center justify-center min-h-[60vh] overflow-hidden"
        style={{ background: heroImage ? `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.6)), url(${heroImage}) center/cover` : "linear-gradient(135deg,#f97316,#ea580c,#c2410c)" }}>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto py-20">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-1.5 text-sm font-medium text-white mb-6">
            <Sun className="w-4 h-4" /> Summer Camp 2026
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">{pageTitle}</h1>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">{description}</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-8 py-4 rounded-xl text-lg hover:bg-orange-50 transition-colors shadow-xl"
          >
            {ctaLabel} <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* PLANS SECTION */}
      {!loading && (data?.plans?.length ?? 0) > 0 && (
        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Camp Programs</h2>
              <p className="text-gray-500 dark:text-gray-400">Choose the program that fits your child best</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(data?.plans ?? []).map((plan) => (
                <div key={plan.id} className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-orange-100 dark:border-orange-900/30 p-6 hover:border-orange-400 dark:hover:border-orange-500 transition-all hover:shadow-lg group">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-4">
                    <Sun className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                  {plan.programTrack && <p className="text-sm text-orange-500 font-medium mb-2">{plan.programTrack}</p>}
                  {plan.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{plan.description}</p>}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-2xl font-black text-orange-600">{Number(plan.price).toLocaleString()} <span className="text-sm font-normal">DA</span></span>
                    <button
                      onClick={() => { setSelectedPlan(plan); setShowForm(true); setStep(1); }}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Register
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WHY US */}
      <section className="py-16 max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Why Choose Our Camp?</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Professional Coaches", desc: "UEFA-certified coaching staff dedicated to youth development" },
            { title: "Fun & Safe Environment", desc: "Age-appropriate activities in a supervised, inclusive setting" },
            { title: "Skill Development", desc: "Structured drills and game situations to improve every aspect of the game" },
          ].map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-orange-500 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to sign up?</h2>
          <p className="text-orange-100 mb-6">Limited spots available — register your child today.</p>
          <button onClick={() => setShowForm(true)} className="bg-white text-orange-600 font-bold px-8 py-3 rounded-xl hover:bg-orange-50 transition-colors">
            {ctaLabel}
          </button>
        </div>
      </section>

      {/* REGISTRATION FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Summer Camp Registration</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Step {step + 1} of {STEPS.length}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {/* Step tabs */}
            <div className="px-6 pt-4">
              <div className="flex gap-1">
                {STEPS.map((s, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? "bg-orange-500" : "bg-gray-100 dark:bg-gray-700"}`} />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                {STEPS.map((s, i) => (
                  <span key={i} className={`text-xs ${i === step ? "text-orange-600 font-medium" : "text-gray-400"}`}>{s}</span>
                ))}
              </div>
            </div>

            <div className="p-6">
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Application Submitted!</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">We have received your registration. Our team will contact you shortly to confirm enrollment.</p>
                  <button onClick={() => { setShowForm(false); setSubmitted(false); setStep(0); setSelectedPlan(null); setForm({ fullName: "", dateOfBirth: "", age: "", gender: "", healthNotes: "", notes: "", guardianName: "", guardianPhone: "", guardianEmail: "", guardianRelation: "parent", sessionId: "" }); setUploadedFiles({}); }} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold transition-colors">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Step 0: Plan */}
                  {step === 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">Choose a Program</h3>
                      {loading ? <div className="text-center py-8 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                        : (data?.plans ?? []).length === 0 ? (
                          <p className="text-center py-8 text-gray-400">No programs available at the moment.</p>
                        ) : (
                          <div className="grid gap-3">
                            {(data?.plans ?? []).map((plan) => (
                              <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedPlan?.id === plan.id ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20" : "border-gray-200 dark:border-gray-700 hover:border-orange-200"}`}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{plan.name}</p>
                                    {plan.programTrack && <p className="text-sm text-orange-500">{plan.programTrack}</p>}
                                    {plan.description && <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-orange-600">{Number(plan.price).toLocaleString()} DA</p>
                                    {selectedPlan?.id === plan.id && <Check className="w-5 h-5 text-orange-500 ml-auto mt-1" />}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Step 1: Info */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-sm">
                        <span className="text-orange-700 dark:text-orange-300 font-medium">Plan: {selectedPlan?.name}</span>
                        {selectedPlan?.price != null && <span className="text-orange-600 ml-2">— {Number(selectedPlan.price).toLocaleString()} DA</span>}
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">Participant Information</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                          <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} placeholder="Participant's full name" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                          <input type="date" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age</label>
                          <input type="number" min={4} max={18} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={form.age} onChange={(e) => setField("age", e.target.value)} placeholder="Age" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                          <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={form.gender} onChange={(e) => setField("gender", e.target.value)}>
                            <option value="">Select...</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                          </select>
                        </div>
                        {(data?.sessions ?? []).length > 0 && (
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session (optional)</label>
                            <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={form.sessionId} onChange={(e) => setField("sessionId", e.target.value)}>
                              <option value="">No preference</option>
                              {(data?.sessions ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} ({new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()})</option>)}
                            </select>
                          </div>
                        )}
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Health Notes</label>
                          <textarea rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none" value={form.healthNotes} onChange={(e) => setField("healthNotes", e.target.value)} placeholder="Any medical conditions, allergies, or special needs..." />
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-2">Guardian / Parent Information</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Full Name *</label>
                          <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={form.guardianName} onChange={(e) => setField("guardianName", e.target.value)} placeholder="Parent/guardian name" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
                          <input type="tel" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={form.guardianPhone} onChange={(e) => setField("guardianPhone", e.target.value)} placeholder="+213..." />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                          <input type="email" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={form.guardianEmail} onChange={(e) => setField("guardianEmail", e.target.value)} placeholder="email@example.com" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Documents */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">Required Documents</h3>
                      {(data?.requirements ?? []).length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-6">No documents required for this registration.</p>
                      ) : (
                        <div className="space-y-3">
                          {(data?.requirements ?? []).map((req) => {
                            const uploaded = uploadedFiles[req.id];
                            return (
                              <div key={req.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{req.title}</span>
                                    {req.isRequired && <span className="ml-2 text-xs text-red-500 font-medium">Required</span>}
                                    {req.description && <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>}
                                  </div>
                                  {uploaded && (
                                    <button onClick={() => setUploadedFiles((p) => { const n = { ...p }; delete n[req.id]; return n; })} className="text-red-400 hover:text-red-600 p-1">
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                {uploaded ? (
                                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                    <Check className="w-4 h-4" /> {uploaded.fileName}
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-orange-500 transition-colors">
                                    {uploading[req.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    {uploading[req.id] ? "Uploading..." : "Click to upload"}
                                    <input type="file" className="hidden" accept={req.allowedTypes} onChange={(e) => handleFileUpload(req.id, e)} />
                                  </label>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Review */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">Review Your Application</h3>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="font-medium">{selectedPlan?.name} — {Number(selectedPlan?.price ?? 0).toLocaleString()} DA</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Participant</span><span className="font-medium">{form.fullName}</span></div>
                        {form.age && <div className="flex justify-between"><span className="text-gray-500">Age</span><span className="font-medium">{form.age}</span></div>}
                        <div className="flex justify-between"><span className="text-gray-500">Guardian</span><span className="font-medium">{form.guardianName}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{form.guardianPhone}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Documents</span><span className="font-medium">{Object.keys(uploadedFiles).length} uploaded</span></div>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={() => step === 0 ? setShowForm(false) : setStep((s) => s - 1)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      {step === 0 ? "Cancel" : "Back"}
                    </button>
                    {step < STEPS.length - 1 ? (
                      <button onClick={() => validateStep() && setStep((s) => s + 1)} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors">
                        Next <ArrowRight className="w-4 h-4 inline ml-1" />
                      </button>
                    ) : (
                      <button onClick={handleSubmit} disabled={submitting} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Submitting...</> : "Submit Application"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
