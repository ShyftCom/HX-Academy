"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, GripVertical, Check, X } from "lucide-react";

interface Req { id: string; title: string; description?: string; isRequired: boolean; allowedTypes: string; maxSizeMb: number; isActive: boolean; order: number; }
type FormState = Omit<Req, "id">;

const blank: FormState = { title: "", description: "", isRequired: true, allowedTypes: "image/*,.pdf", maxSizeMb: 10, isActive: true, order: 0 };

function RequirementForm({ initial, onSave, onCancel, saving }: { initial: FormState; onSave: (v: FormState) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof FormState, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
          <input type="text" className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. ID Card / Passport" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea rows={2} className={inputClass} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Instructions for the applicant..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Types</label>
          <input type="text" className={inputClass} value={form.allowedTypes} onChange={(e) => set("allowedTypes", e.target.value)} placeholder="image/*,.pdf" />
          <p className="text-xs text-gray-400 mt-0.5">Comma-separated MIME types or extensions</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Size (MB)</label>
          <input type="number" min={1} max={50} className={inputClass} value={form.maxSizeMb} onChange={(e) => set("maxSizeMb", parseInt(e.target.value) || 10)} />
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isRequired} onChange={(e) => set("isRequired", e.target.checked)} className="rounded text-green-600" />
            <span className="text-sm font-medium text-gray-700">Required</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="rounded text-green-600" />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
        <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /> Cancel</button>
        <button onClick={() => { if (!form.title.trim()) { toast.error("Title is required"); return; } onSave(form); }} disabled={saving} className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
        </button>
      </div>
    </div>
  );
}

export default function FileRequirementsPage() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/file-requirements");
      const d = await r.json();
      setReqs(d.requirements ?? []);
    } catch { toast.error("Failed to load"); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(form: FormState) {
    setSaving(true);
    try {
      const r = await fetch("/api/file-requirements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, order: reqs.length }) });
      if (r.ok) { toast.success("Created"); setCreating(false); await load(); }
      else { const d = await r.json(); toast.error(d.error || "Failed to create"); }
    } catch { toast.error("Failed to create"); }
    setSaving(false);
  }

  async function handleEdit(id: string, form: FormState) {
    setSaving(true);
    try {
      const r = await fetch(`/api/file-requirements/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (r.ok) { toast.success("Updated"); setEditId(null); await load(); }
      else { const d = await r.json(); toast.error(d.error || "Failed to update"); }
    } catch { toast.error("Failed to update"); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this requirement?")) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/file-requirements/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (r.ok) { toast.success("Deleted"); setReqs((p) => p.filter((x) => x.id !== id)); }
      else toast.error(d.error || "Failed to delete");
    } catch { toast.error("Failed to delete"); }
    setDeletingId(null);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File Requirements</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Documents applicants must upload when applying.</p>
        </div>
        <button onClick={() => { setCreating(true); setEditId(null); }} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Add Requirement
        </button>
      </div>

      {creating && <RequirementForm initial={{ ...blank, order: reqs.length }} onSave={handleCreate} onCancel={() => setCreating(false)} saving={saving} />}

      {reqs.length === 0 && !creating ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400 font-medium">No requirements yet</p>
          <p className="text-gray-400 text-sm mt-1">Add documents applicants need to upload.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reqs.map((req) => (
            <div key={req.id}>
              {editId === req.id ? (
                <RequirementForm initial={{ title: req.title, description: req.description, isRequired: req.isRequired, allowedTypes: req.allowedTypes, maxSizeMb: req.maxSizeMb, isActive: req.isActive, order: req.order }} onSave={(f) => handleEdit(req.id, f)} onCancel={() => setEditId(null)} saving={saving} />
              ) : (
                <div className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${!req.isActive ? "opacity-50" : "border-gray-200"}`}>
                  <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{req.title}</span>
                      {req.isRequired && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Required</span>}
                      {!req.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    {req.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{req.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{req.allowedTypes} · Max {req.maxSizeMb}MB</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { setEditId(req.id); setCreating(false); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(req.id)} disabled={deletingId === req.id} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                      {deletingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
