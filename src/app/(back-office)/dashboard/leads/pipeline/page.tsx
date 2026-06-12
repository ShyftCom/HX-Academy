"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  GripVertical, Pencil, Trash2, Plus, Check, X, Loader2,
  AlertTriangle, Lock, ChevronRight
} from "lucide-react";
import Link from "next/link";

interface LeadStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  isTerminal: boolean;
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function StatusBadge({ status }: { status: Pick<LeadStatus, "name" | "color"> }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: hexToRgba(status.color, 0.15), color: status.color, border: `1px solid ${hexToRgba(status.color, 0.35)}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: status.color }} />
      {status.name}
    </span>
  );
}

export default function PipelinePage() {
  const qc = useQueryClient();
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6B7280");
  const [deleteTarget, setDeleteTarget] = useState<LeadStatus | null>(null);
  const [fallbackId, setFallbackId] = useState("");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6B7280");
  const [showNewForm, setShowNewForm] = useState(false);
  const dragNode = useRef<number | null>(null);

  const { data, isLoading } = useQuery<LeadStatus[]>({
    queryKey: ["lead-statuses"],
    queryFn: () => fetch("/api/lead-statuses").then((r) => r.json()),
  });

  useEffect(() => {
    if (data) setStatuses([...data].sort((a, b) => a.order - b.order));
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      fetch(`/api/lead-statuses/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lead-statuses"] }); toast.success("Stage updated"); setEditingId(null); },
    onError: () => toast.error("Update failed"),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch("/api/lead-statuses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lead-statuses"] }); toast.success("Stage created"); setShowNewForm(false); setNewName(""); setNewColor("#6B7280"); },
    onError: () => toast.error("Create failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, fallbackStatusId }: { id: string; fallbackStatusId?: string }) =>
      fetch(`/api/lead-statuses/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fallbackStatusId }) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lead-statuses"] }); toast.success("Stage deleted"); setDeleteTarget(null); },
    onError: () => toast.error("Delete failed"),
  });

  const reorderMutation = useMutation({
    mutationFn: (order: { id: string; order: number }[]) =>
      fetch("/api/lead-statuses/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) }),
    onError: () => toast.error("Reorder failed"),
  });

  // --- Drag and Drop ---
  function handleDragStart(e: React.DragEvent, id: string, idx: number) {
    setDragId(id);
    dragNode.current = idx;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnter(id: string) { setDragOver(id); }

  function handleDragEnd() {
    if (dragId === null || dragOver === null || dragId === dragOver) {
      setDragId(null); setDragOver(null); dragNode.current = null; return;
    }
    const newList = [...statuses];
    const fromIdx = newList.findIndex((s) => s.id === dragId);
    const toIdx = newList.findIndex((s) => s.id === dragOver);
    const [moved] = newList.splice(fromIdx, 1);
    newList.splice(toIdx, 0, moved);
    const reordered = newList.map((s, i) => ({ ...s, order: i }));
    setStatuses(reordered);
    setDragId(null); setDragOver(null); dragNode.current = null;
    reorderMutation.mutate(reordered.map((s) => ({ id: s.id, order: s.order })));
  }

  function startEdit(s: LeadStatus) { setEditingId(s.id); setEditName(s.name); setEditColor(s.color); }
  function cancelEdit() { setEditingId(null); }
  function saveEdit(s: LeadStatus) {
    if (!editName.trim()) return toast.error("Name is required");
    saveMutation.mutate({ id: s.id, body: { name: editName.trim(), color: editColor } });
  }

  function handleCreate() {
    if (!newName.trim()) return toast.error("Name is required");
    createMutation.mutate({ name: newName.trim(), color: newColor });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  const otherStatuses = statuses.filter((s) => s.id !== deleteTarget?.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/leads" className="hover:underline">Leads</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span style={{ color: "var(--text-primary)" }}>Pipeline Stages</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Pipeline Stages</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Drag to reorder stages. Default stages can be renamed or recolored but not deleted.
        </p>
      </div>

      {/* Stage list */}
      <div className="space-y-2">
        {statuses.map((s) => (
          <div
            key={s.id}
            draggable
            onDragStart={(e) => handleDragStart(e, s.id, s.order)}
            onDragEnter={() => handleDragEnter(s.id)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={handleDragEnd}
            className="rounded-xl transition-all"
            style={{
              background: dragOver === s.id ? hexToRgba(s.color, 0.08) : "var(--card)",
              border: `1px solid ${dragOver === s.id ? hexToRgba(s.color, 0.4) : "var(--card-border)"}`,
              opacity: dragId === s.id ? 0.5 : 1,
            }}
          >
            {editingId === s.id ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative cursor-pointer">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="opacity-0 absolute inset-0 w-10 h-10 cursor-pointer"
                    />
                    <div className="w-10 h-10 rounded-lg border-2" style={{ background: editColor, borderColor: "var(--card-border)" }} />
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    maxLength={40}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(s); if (e.key === "Escape") cancelEdit(); }}
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                    placeholder="Stage name"
                  />
                  <button onClick={() => saveEdit(s)} disabled={saveMutation.isPending}
                    className="p-2 rounded-lg text-white transition-colors" style={{ background: "#A02020" }}>
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button onClick={cancelEdit} className="p-2 rounded-lg transition-colors" style={{ border: "1px solid var(--card-border)", color: "var(--text-muted)" }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3">
                <GripVertical className="w-4 h-4 cursor-grab flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <StatusBadge status={s} />
                <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                  {s.isTerminal && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--muted-bg)", color: "var(--text-muted)" }}>Terminal</span>
                  )}
                  {s.isDefault && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--muted-bg)", color: "var(--text-muted)" }}>Default</span>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                  <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}
                    title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {s.isDefault ? (
                    <button className="p-1.5 rounded-lg opacity-30 cursor-not-allowed" title="Default stages cannot be deleted">
                      <Lock className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                    </button>
                  ) : (
                    <button onClick={() => { setDeleteTarget(s); setFallbackId(statuses.find((x) => x.id !== s.id)?.id ?? ""); }}
                      className="p-1.5 rounded-lg transition-colors" style={{ color: "#A02020" }} title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New stage form */}
      {showNewForm ? (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>New Stage</p>
          <div className="flex items-center gap-3">
            <div className="relative cursor-pointer flex-shrink-0">
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="opacity-0 absolute inset-0 w-10 h-10 cursor-pointer" />
              <div className="w-10 h-10 rounded-lg border-2" style={{ background: newColor, borderColor: "var(--card-border)" }} />
            </div>
            <input
              autoFocus
              type="text"
              value={newName}
              maxLength={40}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowNewForm(false); }}
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
              placeholder="Stage name (max 40 chars)"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewForm(false)} className="px-3 py-1.5 text-sm rounded-lg" style={{ border: "1px solid var(--card-border)", color: "var(--text-muted)" }}>Cancel</button>
            <button onClick={handleCreate} disabled={createMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
              style={{ background: "#A02020" }}>
              {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save Stage
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowNewForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{ border: "2px dashed var(--card-border)", color: "var(--text-muted)" }}>
          <Plus className="w-4 h-4" /> New Stage
        </button>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FEE2E2" }}>
                <AlertTriangle className="w-5 h-5" style={{ color: "#A02020" }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Delete &quot;{deleteTarget.name}&quot;?</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  All leads currently in this stage will be moved to the selected fallback stage.
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Move leads to</label>
              <select
                value={fallbackId}
                onChange={(e) => setFallbackId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
              >
                <option value="">— No status (clear) —</option>
                {otherStatuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm rounded-lg" style={{ border: "1px solid var(--card-border)", color: "var(--text-muted)" }}>Cancel</button>
              <button
                onClick={() => deleteMutation.mutate({ id: deleteTarget.id, fallbackStatusId: fallbackId || undefined })}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                style={{ background: "#A02020" }}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Stage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
