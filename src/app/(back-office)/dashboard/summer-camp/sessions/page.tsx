"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Sun, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { useStation } from "@/context/StationContext";

interface CampSession {
  id: string; name: string; startDate: string; endDate: string; capacity: number | null;
  price: number | null; description: string | null; isActive: boolean;
  _count: { enrollments: number };
  station: { id: string; name: string } | null;
}

const EMPTY = { name: "", startDate: "", endDate: "", capacity: "", price: "", description: "" };

export default function SummerCampSessionsPage() {
  const qc = useQueryClient();
  const { activeStationId } = useStation();
  const [modal, setModal] = useState<"new" | CampSession | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useQuery<CampSession[]>({
    queryKey: ["sc-sessions", activeStationId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (activeStationId) p.set("stationId", activeStationId);
      return fetch(`/api/summer-camp/sessions?${p}`).then((r) => r.json());
    },
  });

  const { mutate: createSession, isPending: creating } = useMutation({
    mutationFn: (data: typeof EMPTY) =>
      fetch("/api/summer-camp/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, stationId: activeStationId ?? undefined }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Session created"); qc.invalidateQueries({ queryKey: ["sc-sessions"] }); setModal(null); },
    onError: () => toast.error("Failed"),
  });

  const { mutate: updateSession, isPending: updating } = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & typeof EMPTY) =>
      fetch(`/api/summer-camp/sessions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["sc-sessions"] }); setModal(null); },
    onError: () => toast.error("Failed"),
  });

  const { mutate: deleteSession, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/summer-camp/sessions/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["sc-sessions"] }); setDeleteId(null); },
    onError: () => toast.error("Failed"),
  });

  const openNew = () => { setForm(EMPTY); setModal("new"); };
  const openEdit = (s: CampSession) => {
    setForm({
      name: s.name,
      startDate: s.startDate ? s.startDate.split("T")[0] : "",
      endDate: s.endDate ? s.endDate.split("T")[0] : "",
      capacity: s.capacity ? String(s.capacity) : "",
      price: s.price ? String(s.price) : "",
      description: s.description ?? "",
    });
    setModal(s);
  };

  const save = () => {
    if (!form.name || !form.startDate || !form.endDate) { toast.error("Name, start and end dates are required"); return; }
    if (modal === "new") createSession(form);
    else if (modal) updateSession({ id: (modal as CampSession).id, ...form });
  };

  const allSessions = Array.isArray(sessions) ? sessions : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Camp Sessions" description="Define the available summer camp sessions participants can enroll in.">
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New Session</Button>
      </PageHeader>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : allSessions.length === 0 ? (
        <EmptyState icon={Sun} title="No sessions yet" description="Create your first summer camp session." action={{ label: "New Session", onClick: openNew }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allSessions.map((s) => (
            <div key={s.id} className={`bg-white dark:bg-gray-800 border rounded-xl p-5 ${s.isActive ? "border-gray-200 dark:border-gray-700" : "border-gray-100 dark:border-gray-800 opacity-60"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sun className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(s)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteId(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <h3 className="font-semibold text-base mb-1">{s.name}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}
              </div>
              {s.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{s.description}</p>}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{s._count.enrollments} enrolled{s.capacity ? ` / ${s.capacity}` : ""}</span>
                {s.price != null && <span className="font-semibold text-orange-600">{Number(s.price).toLocaleString()} DA</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Dialog open onOpenChange={() => setModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{modal === "new" ? "New Session" : "Edit Session"}</DialogTitle></DialogHeader>
            <DialogBody className="space-y-4">
              <div><Label>Session Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Summer Camp 2026 – July" className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="mt-1" /></div>
                <div><Label>End Date *</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Capacity (optional)</Label><Input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="Max participants" className="mt-1" /></div>
                <div><Label>Price (DA)</Label><Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0" className="mt-1" /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Session description..." rows={2} className="mt-1" /></div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={save} disabled={creating || updating}>{creating || updating ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Session" description="This will delete the session and unlink all enrolled participants." onConfirm={() => deleteId && deleteSession(deleteId)} loading={deleting} variant="destructive" />
    </div>
  );
}
