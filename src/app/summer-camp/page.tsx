"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Upload, Loader2, CheckCircle2, X, Sun, Calendar, MapPin } from "lucide-react";

interface Session {
  id: string; name: string; startDate: string; endDate: string; capacity?: number; price?: number; description?: string;
}
interface FileReq {
  id: string; title: string; description?: string; isRequired: boolean; allowedTypes: string; maxSizeMb: number;
}

const STEPS = ["Info", "Documents", "Review"];

export default function SummerCampPage() {
  const [step, setStep] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [fileReqs, setFileReqs] = useState<FileReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    fullName: "", dateOfBirth: "", age: "", gender: "",
    healthNotes: "", notes: "",
    guardianName: "", guardianPhone: "", guardianEmail: "", guardianRelation: "parent",
    sessionId: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { fileName: string; fileUrl: string; mimeType?: string; size?: number }>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch("/api/public/summer-camp")
      .then((r) => r.json())
      .then((d) => { setSessions(d.sessions ?? []); setFileReqs(d.requirements ?? []); setLoading(false); })
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
      if (res.ok) {
        setUploadedFiles((p) => ({ ...p, [reqId]: { fileName: file.name, fileUrl: d.url, mimeType: file.type, size: file.size } }));
      } else {
        toast.error(d.error ?? "Upload failed");
      }
    } catch { toast.error("Upload failed"); }
    finally { setUploading((p) => ({ ...p, [reqId]: false })); }
  }

  function validateStep0() {
    if (!form.fullName.trim()) { toast.error("Participant name is required"); return false; }
    if (!form.guardianName.trim()) { toast.error("Guardian name is required"); return false; }
    if (!form.guardianPhone.trim()) { toast.error("Guardian phone is required"); return false; }
    return true;
  }

  function validateStep1() {
    const missing = fileReqs.filter((r) => r.isRequired && !uploadedFiles[r.id]);
    if (missing.length > 0) { toast.error(`Please upload: ${missing.map((r) => r.title).join(", ")}`); return false; }
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const files = Object.entries(uploadedFiles).map(([reqId, f]) => ({ requirementId: reqId, ...f }));
      const res = await fetch("/api/public/summer-camp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, age: form.age ? Number(form.age) : undefined, files }),
      });
      const d = await res.json();
      if (res.ok) { setSubmitted(true); }
      else if (d.error === "duplicate") { toast.error("An application already exists with this phone number."); }
      else { toast.error(d.message ?? "Submission failed"); }
    } catch { toast.error("Submission failed"); }
    finally { setSubmitting(false); }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 max-w-md w-full text-center shadow-xl">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
        <p className="text-gray-500 mb-6">Thank you! We'll contact you shortly to confirm enrollment in the summer camp.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  );

  const selectedSession = sessions.find((s) => s.id === form.sessionId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800">
      {/* Hero */}
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 py-12 px-4 text-white text-center">
        <Sun className="w-10 h-10 mx-auto mb-3 opacity-90" />
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Summer Camp Registration</h1>
        <p className="text-orange-100 text-lg">Join us for an unforgettable football summer camp experience!</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${i < step ? "bg-green-500 text-white" : i === step ? "bg-orange-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${i === step ? "text-orange-600 dark:text-orange-400" : "text-gray-400"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">

          {/* Step 0 — Info */}
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Participant Information</h2>

              {sessions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Camp Session</label>
                  <div className="grid gap-3">
                    {sessions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setField("sessionId", s.id)}
                        className={`text-left p-4 rounded-xl border-2 transition-colors ${form.sessionId === s.id ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20" : "border-gray-200 dark:border-gray-700 hover:border-orange-300"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{s.name}</p>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}</span>
                              {s.capacity && <span>{s.capacity} spots</span>}
                            </div>
                            {s.description && <p className="text-xs text-gray-500 mt-1">{s.description}</p>}
                          </div>
                          {s.price != null && <span className="font-bold text-orange-600 text-lg">{Number(s.price).toLocaleString()} DA</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Participant Full Name *</label>
                  <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} placeholder="Child's full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input type="date" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Age</label>
                  <input type="number" min="3" max="18" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" value={form.age} onChange={(e) => setField("age", e.target.value)} placeholder="Age in years" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" value={form.gender} onChange={(e) => setField("gender", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Health Notes / Allergies</label>
                  <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" value={form.healthNotes} onChange={(e) => setField("healthNotes", e.target.value)} placeholder="Any medical conditions, allergies, or special needs the camp should know about" rows={2} />
                </div>
              </div>

              <hr className="border-gray-100 dark:border-gray-700" />
              <h3 className="font-semibold">Parent / Guardian Information</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Guardian Name *</label>
                  <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" value={form.guardianName} onChange={(e) => setField("guardianName", e.target.value)} placeholder="Parent or guardian name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Relation</label>
                  <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" value={form.guardianRelation} onChange={(e) => setField("guardianRelation", e.target.value)}>
                    <option value="parent">Parent</option>
                    <option value="mother">Mother</option>
                    <option value="father">Father</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <input type="tel" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" value={form.guardianPhone} onChange={(e) => setField("guardianPhone", e.target.value)} placeholder="0555 123 456" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" value={form.guardianEmail} onChange={(e) => setField("guardianEmail", e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Additional Notes</label>
                  <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Anything else you'd like us to know..." rows={2} />
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Documents */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Required Documents</h2>
              {fileReqs.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No documents required for this program.</p>
              ) : (
                <div className="space-y-4">
                  {fileReqs.map((req) => {
                    const uploaded = uploadedFiles[req.id];
                    return (
                      <div key={req.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{req.title} {req.isRequired && <span className="text-red-500">*</span>}</p>
                            {req.description && <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>}
                          </div>
                          {uploaded && (
                            <button onClick={() => setUploadedFiles((p) => { const c = { ...p }; delete c[req.id]; return c; })} className="text-gray-400 hover:text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {uploaded ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm text-green-700 dark:text-green-400 truncate">{uploaded.fileName}</span>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:border-orange-400 transition-colors">
                            {uploading[req.id] ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-gray-400" />}
                            <span className="text-sm text-gray-500">{uploading[req.id] ? "Uploading..." : "Click to upload"}</span>
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

          {/* Step 2 — Review */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Review & Submit</h2>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2 text-sm">
                {selectedSession && (
                  <div className="flex justify-between"><span className="text-gray-500">Session</span><span className="font-medium">{selectedSession.name}</span></div>
                )}
                <div className="flex justify-between"><span className="text-gray-500">Participant</span><span className="font-medium">{form.fullName}</span></div>
                {form.dateOfBirth && <div className="flex justify-between"><span className="text-gray-500">Date of Birth</span><span>{new Date(form.dateOfBirth).toLocaleDateString()}</span></div>}
                {form.gender && <div className="flex justify-between"><span className="text-gray-500">Gender</span><span>{form.gender === "M" ? "Male" : "Female"}</span></div>}
                <hr className="border-gray-200 dark:border-gray-600" />
                <div className="flex justify-between"><span className="text-gray-500">Guardian</span><span className="font-medium">{form.guardianName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{form.guardianPhone}</span></div>
                {form.guardianEmail && <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{form.guardianEmail}</span></div>}
                {form.healthNotes && <div className="flex justify-between gap-4"><span className="text-gray-500 flex-shrink-0">Health Notes</span><span className="text-right">{form.healthNotes}</span></div>}
              </div>
              {Object.keys(uploadedFiles).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">Uploaded Documents</p>
                  <div className="space-y-1">
                    {Object.values(uploadedFiles).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm"><Check className="w-3.5 h-3.5 text-green-500" /><span>{f.fileName}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className={`flex mt-8 ${step > 0 ? "justify-between" : "justify-end"}`}>
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 0 && !validateStep0()) return;
                  if (step === 1 && !validateStep1()) return;
                  setStep((s) => s + 1);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Check className="w-4 h-4" /> Submit Application</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
