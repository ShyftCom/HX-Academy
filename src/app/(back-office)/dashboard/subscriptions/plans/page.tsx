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

const COLORS = ["#3B82F6","#10B981","#8B5CF6","#F59E0B","#EF4444","#EC4899","#14B8A6","#F97316"];
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  duration: z.string().min(1, "Duration is required"),
  durationType: z.string(),
  price: z.string().min(1, "Price is required"),
  color: z.string(),
  isActive: z.boolean(),
});
type FormData = z.infer<typeof schema>;

export default function PlansPage() {
  const qc = useQueryClient();
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
    onError: () => toast.error("Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/subscriptions/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Plan deleted"); qc.invalidateQueries({ queryKey: ["subscription-plans"] }); setDeleteId(null); },
    onError: () => toast.error("Delete failed"),
  });

  const openAdd = () => {
    setEditPlan(null); setSelectedColor(COLORS[0]);
    reset({ name: "", description: "", duration: "", durationType: "month", price: "", color: COLORS[0], isActive: true });
    setModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditPlan(p); setSelectedColor(p.color ?? COLORS[0]);
    reset({ name: p.name, description: p.description ?? "", duration: String(p.duration), durationType: p.durationType, price: String(p.price), color: p.color, isActive: p.isActive });
    setModalOpen(true);
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-5">
      <PageHeader title="Subscription Plans" description="Manage academy membership plans">
        <Button onClick={openAdd}><Plus className="me-2 h-4 w-4" />Add Plan</Button>
      </PageHeader>

      {plans?.length === 0 ? (
        <EmptyState icon={CreditCard} title="No plans yet" description="Create your first subscription plan to get started" action={{ label: "Add Plan", onClick: openAdd }} />
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
                  <Button variant="outline" size="sm" onClick={() => openEdit(plan)}><Edit className="me-1.5 h-3.5 w-3.5" />Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteId(plan.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button>
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
              <Input {...register("name")} label="Plan Name *" placeholder="e.g. Monthly Plan" error={errors.name?.message} />
              <Textarea {...register("description")} label="Description" placeholder="What's included..." rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <Input {...register("duration")} label="Duration *" type="number" min="1" placeholder="1" error={errors.duration?.message} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
                  <Select onValueChange={(v) => setValue("durationType", v)} defaultValue={editPlan?.durationType ?? "month"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="month">Month(s)</SelectItem><SelectItem value="year">Year(s)</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Input {...register("price")} label="Price (DA) *" type="number" min="0" placeholder="5000" error={errors.price?.message} />
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setSelectedColor(c)} className="h-7 w-7 rounded-full ring-offset-2 transition-all" style={{ backgroundColor: c, outline: selectedColor === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={watch("isActive")} onCheckedChange={(v) => setValue("isActive", v)} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={saveMutation.isPending}>{editPlan ? "Save Changes" : "Create Plan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete Plan" description="Are you sure you want to delete this plan? Existing subscriptions will not be affected." confirmLabel="Delete" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
