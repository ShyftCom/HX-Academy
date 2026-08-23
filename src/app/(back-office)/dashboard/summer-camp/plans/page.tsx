"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocaleTextInput } from "@/components/website/admin/LocaleTextInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { useStation } from "@/context/StationContext";
import { useTranslation } from "react-i18next";

interface SCPlan {
  id: string; name: string; nameFr: string | null; nameAr: string | null;
  programTrack: string | null; price: number;
  description: string | null; descriptionFr: string | null; descriptionAr: string | null;
  isActive: boolean; order: number;
}

const EMPTY = { name: "", nameFr: "", nameAr: "", programTrack: "", price: "", description: "", descriptionFr: "", descriptionAr: "" };

export default function SummerCampPlansPage() {
  const { t } = useTranslation("summercamp");
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
    onSuccess: () => { toast.success(t("plans.created")); qc.invalidateQueries({ queryKey: ["sc-plans"] }); setModal(null); },
    onError: () => toast.error(t("common:toast.create_failed_alt")),
  });

  const { mutate: updatePlan, isPending: updating } = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & typeof EMPTY) =>
      fetch(`/api/summer-camp/plans/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("common:toast.saved")); qc.invalidateQueries({ queryKey: ["sc-plans"] }); setModal(null); },
    onError: () => toast.error(t("common:toast.save_failed_alt")),
  });

  const { mutate: deletePlan, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/summer-camp/plans/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("common:toast.deleted")); qc.invalidateQueries({ queryKey: ["sc-plans"] }); setDeleteId(null); },
    onError: () => toast.error(t("common:errors.failed_to_delete")),
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
    setForm({ name: p.name, nameFr: p.nameFr ?? "", nameAr: p.nameAr ?? "", programTrack: p.programTrack ?? "", price: String(p.price), description: p.description ?? "", descriptionFr: p.descriptionFr ?? "", descriptionAr: p.descriptionAr ?? "" });
    setModal(p);
  };

  const save = () => {
    if (!form.name.trim()) { toast.error(t("plans.name_required")); return; }
    if (modal === "new") createPlan(form);
    else if (modal) updatePlan({ id: (modal as SCPlan).id, ...form });
  };

  const allPlans = Array.isArray(plans) ? plans : [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("plans.title")} description={t("plans.subtitle")}>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> {t("plans.new")}</Button>
      </PageHeader>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">{t("common:ui.loading")}</div>
      ) : allPlans.length === 0 ? (
        <EmptyState icon={Sun} title={t("plans.empty")} description={t("plans.empty_body")} action={{ label: t("plans.new"), onClick: openNew }} />
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
                <Label>{t("plans.name")}</Label>
                <LocaleTextInput baseKey="name" values={form} onChange={(next) => setForm(next as typeof form)} />
              </div>
              <div>
                <Label>{t("plans.track")}</Label>
                <Input value={form.programTrack} onChange={(e) => setForm((f) => ({ ...f, programTrack: e.target.value }))} placeholder={t("plans.track_ph")} className="mt-1" />
              </div>
              <div>
                <Label>{t("common:ui.price_da_req")}</Label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label>{t("common:ui.description")}</Label>
                <LocaleTextInput baseKey="description" values={form} onChange={(next) => setForm(next as typeof form)} multiline />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>{t("common:ui.cancel")}</Button>
              <Button onClick={save} disabled={creating || updating}>{creating || updating ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title={t("plans.delete")}
        description={t("plans.delete_body")}
        onConfirm={() => deleteId && deletePlan(deleteId)}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
