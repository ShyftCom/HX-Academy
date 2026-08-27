"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit, Trash2, CreditCard } from "lucide-react";
import { LocaleFields } from "@/components/website/admin/LocaleTextInput";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permission-names";

const COLORS = ["#3B82F6","#10B981","#8B5CF6","#F59E0B","#EF4444","#EC4899","#14B8A6","#F97316"];
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  nameFr: z.string().optional(),
  nameAr: z.string().optional(),
  description: z.string().optional(),
  descriptionFr: z.string().optional(),
  descriptionAr: z.string().optional(),
  duration: z.string().min(1, "Duration is required"),
  durationType: z.string(),
  price: z.string().min(1, "Price is required"),
  color: z.string(),
  isActive: z.boolean(),
});
type FormData = z.infer<typeof schema>;

export default function PlansPage() {
  const { t } = useTranslation("subscriptions");
  const qc = useQueryClient();
  // Mirrors the gates the plan routes now enforce server-side. Staff reach
  // this page on subscriptions:view alone and hold none of the three.
  const { can } = usePermissions();
  const canCreate = can(PERMISSIONS.SUBS_CREATE);
  const canEdit = can(PERMISSIONS.SUBS_EDIT);
  const canDelete = can(PERMISSIONS.SUBS_DELETE);

  const [modalOpen, setModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => fetch("/api/subscriptions/plans").then((r) => r.json()),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { durationType: "month", isActive: true, color: COLORS[0] },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const url = editPlan ? `/api/subscriptions/plans/${editPlan.id}` : "/api/subscriptions/plans";
      const res = await fetch(url, { method: editPlan ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, color: selectedColor }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast.success(editPlan ? "Plan updated" : "Plan created"); qc.invalidateQueries({ queryKey: ["subscription-plans"] }); setModalOpen(false); reset(); setEditPlan(null); },
    onError: () => toast.error(t("common:toast.save_failed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/subscriptions/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success(t("plans.deleted")); qc.invalidateQueries({ queryKey: ["subscription-plans"] }); setDeleteId(null); },
    onError: () => toast.error(t("common:toast.delete_failed")),
  });

  const openAdd = () => {
    setEditPlan(null); setSelectedColor(COLORS[0]);
    reset({ name: "", nameFr: "", nameAr: "", description: "", descriptionFr: "", descriptionAr: "", duration: "", durationType: "month", price: "", color: COLORS[0], isActive: true });
    setModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditPlan(p); setSelectedColor(p.color ?? COLORS[0]);
    reset({ name: p.name, nameFr: p.nameFr ?? "", nameAr: p.nameAr ?? "", description: p.description ?? "", descriptionFr: p.descriptionFr ?? "", descriptionAr: p.descriptionAr ?? "", duration: String(p.duration), durationType: p.durationType, price: String(p.price), color: p.color, isActive: p.isActive });
    setModalOpen(true);
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-5">
      <PageHeader title={t("plans.title")} description={t("plans.subtitle")}>
        {canCreate && <Button onClick={openAdd}><Plus className="me-2 h-4 w-4" />{t("plans.add")}</Button>}
      </PageHeader>

      {plans?.length === 0 ? (
        <EmptyState icon={CreditCard} title={t("plans.empty")} description={t("plans.empty_body")} action={{ label: t("plans.add"), onClick: openAdd }} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans?.map((plan: any) => (
            <Card key={plan.id} className="relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: plan.color }} />
              <CardContent className="ps-5 pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                    {plan.description && <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>}
                  </div>
                  <Badge variant={plan.isActive ? "success" : "secondary"}>{plan.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(plan.price)}</p>
                  <p className="text-sm text-gray-500">{plan.duration} {plan.durationType}{plan.duration > 1 ? "s" : ""}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  {canEdit && <Button variant="outline" size="sm" onClick={() => openEdit(plan)}><Edit className="me-1.5 h-3.5 w-3.5" />{t("common:ui.edit")}</Button>}
                  {canDelete && <Button variant="outline" size="sm" onClick={() => setDeleteId(plan.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{editPlan ? "Edit Plan" : "New Subscription Plan"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
            <DialogBody className="space-y-4">
              <LocaleFields register={register as never} baseKey="name" label={t("plans.name")} placeholder={t("plans.name_ph")} />
              {errors.name?.message && <p className="text-xs text-red-500">{errors.name.message}</p>}
              <LocaleFields register={register as never} baseKey="description" label={t("common:ui.description")} placeholder={t("plans.description_ph")} multiline rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <Input {...register("duration")} label={t("plans.duration")} type="number" min="1" placeholder="1" error={errors.duration?.message} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("plans.unit")}</label>
                  <Select onValueChange={(v) => setValue("durationType", v)} defaultValue={editPlan?.durationType ?? "month"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="month">{t("plans.months")}</SelectItem><SelectItem value="year">{t("plans.years")}</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Input {...register("price")} label={t("plans.price")} type="number" min="0" placeholder="5000" error={errors.price?.message} />
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("plans.color")}</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setSelectedColor(c)} className="h-7 w-7 rounded-full ring-offset-2 transition-all" style={{ backgroundColor: c, outline: selectedColor === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={watch("isActive")} onCheckedChange={(v) => setValue("isActive", v)} />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t("common:ui.active")}</span>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{t("common:ui.cancel")}</Button>
              <Button type="submit" loading={saveMutation.isPending}>{editPlan ? "Save Changes" : "Create Plan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title={t("plans.delete_title")} description={t("plans.delete_body")} confirmLabel={t("common:ui.delete")} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
