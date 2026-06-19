"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { useStation } from "@/context/StationContext";

interface SCPlan {
  id: string; name: string; programTrack: string | null; price: number;
  description: string | null; isActive: boolean; order: number;
}

const EMPTY = { name: "", programTrack: "", price: "", description: "" };

export default function SummerCampPlansPage() {
  const qc = useQueryClient();
  const { activeStationId } = useStation();
  const [modal, setModal] = useState<"new" | SCPlan | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery<SCPlan[]>({
    queryKey: ["sc-plans", activeStationId],
    queryFn: () => {
      const p = new URLSearchParams({ activeOnly: "false" });
      if (activeStationId) p.set("stationId", activeStationId);
      return fetch(`/api/summer-camp/plans?${p}`).then((r) => r.json());
    },
  });

  const { mutate: createPlan, isPending: creating } = useMutation({
    mutationFn: (data: typeof EMPTY) =>
      fetch("/api/summer-camp/plans", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, stationId: activeStationId ?? undefined }),
      }).then((r) => r.json()),
    onSuccess: () => { toast.success("Plan created"); qc.invalidateQueries({ queryKey: ["sc-plans"] }); setModal(null); },
    onError: () => toast.error("Failed to create"),
  });

  const { mutate: updatePlan, isPending: updating } = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & typeof EMPTY) =>
      fetch(`/api/summer-camp/plans/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["sc-plans"] }); setModal(null); },
    onError: () => toast.error("Failed to save"),
  });

  const { mutate: deletePlan, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/summer-camp/plans/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["sc-plans"] }); setDeleteId(null); },
    onError: () => toast.error("Failed to delete"),
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/summer-camp/plans/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sc-plans"] }),
  });

  const openNew = () => { setForm(EMPTY); setModal("new"); };
  const openEdit = (p: SCPlan) => {
    setForm({ name: p.name, programTrack: p.programTrack ?? "", price: String(p.price), description: p.description ?? "" });
    setModal(p);
  };

  const save = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (modal === "new") createPlan(form);
    else if (modal) updatePlan({ id: (modal as SCPlan).id, ...form });
  };

  const allPlans = Array.isArray(plans) ? plans : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Summer Camp Plans" description="Define the programs and pricing for summer camp enrollment.">
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New Plan</Button>
      </PageHeader>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : allPlans.length === 0 ? (
        <EmptyState icon={Sun} title="No plans yet" description="Create your first summer camp plan." action={{ label: "New Plan", onClick: openNew }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allPlans.map((plan) => (
            <div key={plan.id} className={`bg-white dark:bg-gray-800 border rounded-xl p-5 ${plan.isActive ? "border-gray-200 dark:border-gray-700" : "border-gray-100 dark:border-gray-800 opacity-60"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sun className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={plan.isActive ? "default" : "secondary"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleActive({ id: plan.id, isActive: !plan.isActive })}
                  >
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(plan)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteId(plan.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <h3 className="font-semibold text-base mb-1">{plan.name}</h3>
              {plan.programTrack && <p className="text-xs text-orange-600 dark:text-orange-400 mb-1 font-medium">{plan.programTrack}</p>}
              {plan.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{plan.description}</p>}
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-2">{Number(plan.price).toLocaleString()} DA</div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Dialog open onOpenChange={() => setModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{modal === "new" ? "New Plan" : "Edit Plan"}</DialogTitle></DialogHeader>
            <DialogBody className="space-y-4">
              <div>
                <Label>Plan Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Junior Goalkeeper Training" className="mt-1" />
              </div>
              <div>
                <Label>Program / Track</Label>
                <Input value={form.programTrack} onChange={(e) => setForm((f) => ({ ...f, programTrack: e.target.value }))} placeholder="e.g. U10 Outfield" className="mt-1" />
              </div>
              <div>
                <Label>Price (DA) *</Label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description of this plan..." rows={2} className="mt-1" />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={save} disabled={creating || updating}>{creating || updating ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Plan"
        description="This will permanently delete this plan."
        onConfirm={() => deleteId && deletePlan(deleteId)}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
