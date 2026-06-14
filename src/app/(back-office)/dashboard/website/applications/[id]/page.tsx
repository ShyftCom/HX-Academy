"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle, User, ExternalLink, ChevronDown } from "lucide-react";

interface Application {
  id: string; fullName: string; phone?: string; email?: string; dateOfBirth?: string; parentName?: string; parentPhone?: string; address?: string; categoryInterest?: string; adminNotes?: string; isConverted: boolean; createdAt: string;
  status?: { id: string; name: string; color?: string };
  selectedPlan?: { id: string; name: string; price: number; durationType: string; duration: number };
  surveyAnswers?: { id: string; answer: string; question?: { question: string; questionType: string } }[];
  applicationFiles?: { id: string; fileName: string; fileUrl: string; requirement?: { title: string } }[];
  assignedStaff?: { id: string; name?: string; email?: string };
}

interface LeadStatus { id: string; name: string; color?: string; }

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveForm, setApproveForm] = useState({ createAccount: true, password: "", subscriptionStart: "", subscriptionEnd: "" });
  const [notes, setNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/applications/${id}`).then((r) => r.json()),
      fetch("/api/lead-statuses").then((r) => r.json()),
    ]).then(([appData, statusData]) => {
      setApp(appData);
      setNotes(appData.adminNotes ?? "");
      setSelectedStatus(appData.status?.id ?? "");
      setStatuses(statusData.statuses ?? statusData ?? []);
    }).catch(() => toast.error("Failed to load")).finally(() => setLoading(false));
  }, [id]);

  async function saveNotes() {
    setSaving(true);
    try {
      const r = await fetch(`/api/applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminNotes: notes, statusId: selectedStatus || undefined }) });
      if (r.ok) { toast.success("Saved"); const d = await r.json(); setApp(d); }
      else toast.error("Failed to save");
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  async function handleApprove() {
    setApproving(true);
    try {
      const r = await fetch(`/api/applications/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(approveForm) });
      const d = await r.json();
      if (r.ok) { toast.success("Application approved!"); setShowApproveDialog(false); setApp((p) => p ? { ...p, isConverted: true } : p); }
      else toast.error(d.error ?? "Approval failed");
    } catch { toast.error("Approval failed"); }
    setApproving(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!app) return <div className="text-center text-gray-500 dark:text-gray-400 py-20">Application not found.</div>;

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500";

  const detailRow = (label: string, value?: string | null) => value ? (
    <div className="flex items-start gap-3 py-2">
      <span className="text-sm text-gray-400 dark:text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 dark:text-white font-medium">{value}</span>
    </div>
  ) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{app.fullName}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Submitted {new Date(app.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
        {!app.isConverted && (
          <button onClick={() => setShowApproveDialog(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors">
            <CheckCircle className="w-4 h-4" /> Approve
          </button>
        )}
        {app.isConverted && <span className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-full font-medium"><CheckCircle className="w-4 h-4" /> Approved</span>}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="col-span-2 space-y-4">
          {/* Personal Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> Personal Information</h2>
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {detailRow("Full Name", app.fullName)}
              {detailRow("Phone", app.phone)}
              {detailRow("Email", app.email)}
              {detailRow("Date of Birth", app.dateOfBirth ? new Date(app.dateOfBirth).toLocaleDateString() : null)}
              {detailRow("Category", app.categoryInterest)}
              {detailRow("Address", app.address)}
              {detailRow("Parent Name", app.parentName)}
              {detailRow("Parent Phone", app.parentPhone)}
            </div>
          </div>

          {/* Selected Plan */}
          {app.selectedPlan && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Selected Plan</h2>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800 dark:text-gray-200">{app.selectedPlan.name}</span>
                <span className="text-green-700 dark:text-green-400 font-semibold">{app.selectedPlan.price.toLocaleString()} / {app.selectedPlan.duration} {app.selectedPlan.durationType}</span>
              </div>
            </div>
          )}

          {/* Survey Answers */}
          {app.surveyAnswers && app.surveyAnswers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Survey Answers</h2>
              <div className="space-y-4">
                {app.surveyAnswers.map((a) => (
                  <div key={a.id}>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">{a.question?.question ?? "Question"}</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{(() => { try { const p = JSON.parse(a.answer); return Array.isArray(p) ? p.join(", ") : a.answer; } catch { return a.answer; } })()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {app.applicationFiles && app.applicationFiles.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Uploaded Documents</h2>
              <div className="space-y-2">
                {app.applicationFiles.map((f) => (
                  <a key={f.id} href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {f.fileName.split(".").pop()?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {f.requirement && <p className="text-xs text-gray-400 dark:text-gray-500">{f.requirement.title}</p>}
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{f.fileName}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</h3>
            <div className="relative">
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className={`appearance-none pe-8 ${inputClass}`}>
                <option value="">No status</option>
                {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Admin Notes</h3>
            <textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} resize-none`} placeholder="Add internal notes..." />
            <button onClick={saveNotes} disabled={saving} className="mt-2 w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Notes
            </button>
          </div>
        </div>
      </div>

      {/* Approve Dialog */}
      {showApproveDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Approve Application</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">This will convert the lead into a player. Optionally create a user account.</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={approveForm.createAccount} onChange={(e) => setApproveForm((p) => ({ ...p, createAccount: e.target.checked }))} className="rounded text-green-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Create player account</span>
            </label>
            {approveForm.createAccount && (
              app.email ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Initial Password</label>
                  <input type="text" value={approveForm.password} onChange={(e) => setApproveForm((p) => ({ ...p, password: e.target.value }))} className={inputClass} placeholder="Leave blank for auto-generated" />
                </div>
              ) : (
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">No email address — account cannot be created without an email.</p>
              )
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subscription Start</label>
                <input type="date" value={approveForm.subscriptionStart} onChange={(e) => setApproveForm((p) => ({ ...p, subscriptionStart: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subscription End</label>
                <input type="date" value={approveForm.subscriptionEnd} onChange={(e) => setApproveForm((p) => ({ ...p, subscriptionEnd: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowApproveDialog(false)} className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleApprove} disabled={approving} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
