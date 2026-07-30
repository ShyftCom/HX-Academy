"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Receipt } from "lucide-react";
import { useStation } from "@/context/StationContext";
import { useTranslation } from "react-i18next";

function formatDA(n: number) { return Number(n).toLocaleString("fr-DZ") + " DA"; }

export default function ChargesPage() {
  const { t } = useTranslation("finance");
  const { activeStationId } = useStation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#6B7280");
  const [form, setForm] = useState({ title: "", categoryId: "", amount: "", chargeDate: new Date().toISOString().split("T")[0], notes: "", isSalary: false });

  const chargeParams = new URLSearchParams({ ...(activeStationId ? { stationId: activeStationId } : {}) });
  const { data: charges = [] } = useQuery<any[]>({
    queryKey: ["charges", activeStationId],
    queryFn: () => fetch(`/api/charges?${chargeParams}`).then((r) => r.json()),
  });

  const catParams = new URLSearchParams({ ...(activeStationId ? { stationId: activeStationId } : {}) });
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["charge-categories", activeStationId],
    queryFn: () => fetch(`/api/charges/categories?${catParams}`).then((r) => r.json()),
  });

  const createCharge = useMutation({
    mutationFn: (data: any) => fetch("/api/charges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["charges"] }); toast.success(t("charges.added")); setOpen(false); setForm({ title: "", categoryId: "", amount: "", chargeDate: new Date().toISOString().split("T")[0], notes: "", isSalary: false }); },
    onError: () => toast.error(t("charges.add_failed")),
  });

  const deleteCharge = useMutation({
    mutationFn: (id: string) => fetch(`/api/charges/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["charges"] }); toast.success(t("charges.deleted")); },
  });

  const createCategory = useMutation({
    mutationFn: (data: any) => fetch("/api/charges/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["charge-categories"] }); toast.success(t("charges.category_created")); setCatName(""); setCatOpen(false); },
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => fetch(`/api/charges/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["charge-categories"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{t("charges.title")}</h1><p className="text-sm text-gray-500">{t("charges.subtitle")}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatOpen(!catOpen)}>{t("charges.manage_categories")}</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="me-2 h-4 w-4" />{t("charges.add")}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("charges.add")}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1"><Label>{t("common:ui.title_field")} <span className="text-red-500">*</span></Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("common:ui.category")}</Label>
                    <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                      <option value="">{t("charges.no_category")}</option>
                      {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1"><Label>{t("charges.amount_da")} <span className="text-red-500">*</span></Label><Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
                </div>
                <div className="space-y-1"><Label>{t("common:ui.date")} <span className="text-red-500">*</span></Label><Input type="date" value={form.chargeDate} onChange={(e) => setForm((f) => ({ ...f, chargeDate: e.target.value }))} /></div>
                <div className="space-y-1"><Label>{t("common:ui.notes")}</Label><Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isSalary} onChange={(e) => setForm((f) => ({ ...f, isSalary: e.target.checked }))} />
                  Is Salary charge
                </label>
                <Button className="w-full" disabled={!form.title || !form.amount || createCharge.isPending}
                  onClick={() => createCharge.mutate({ ...form, amount: Number(form.amount), stationId: activeStationId })}>
                  {createCharge.isPending ? "Adding..." : "Add Charge"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {catOpen && (
        <Card>
          <CardHeader><CardTitle>{t("charges.categories_title")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                  {c.name}
                  {!c.isGlobal && (
                    <button onClick={() => deleteCategory.mutate(c.id)} className="ms-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)} className="h-9 w-9 rounded border p-1 cursor-pointer" />
              <Input placeholder={t("charges.category_ph")} value={catName} onChange={(e) => setCatName(e.target.value)} className="flex-1" />
              <Button size="sm" disabled={!catName || createCategory.isPending} onClick={() => createCategory.mutate({ name: catName, color: catColor, stationId: activeStationId })}>{t("common:ui.add")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />{t("charges.list")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500">
              <th className="text-start py-2 pe-4">{t("common:ui.date")}</th>
              <th className="text-start py-2 pe-4">{t("common:ui.title_field")}</th>
              <th className="text-start py-2 pe-4">{t("common:ui.category")}</th>
              <th className="text-end py-2 pe-4">{t("common:ui.amount")}</th>
              <th className="text-center py-2 pe-4">{t("charges.salary")}</th>
              <th className="text-end py-2">{t("common:ui.actions")}</th>
            </tr></thead>
            <tbody>
              {charges.map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="py-3 pe-4 text-gray-500">{new Date(c.chargeDate).toLocaleDateString("fr-DZ")}</td>
                  <td className="py-3 pe-4 font-medium">{c.title}</td>
                  <td className="py-3 pe-4">
                    {c.category ? (
                      <Badge style={{ background: c.category.color + "20", color: c.category.color, border: `1px solid ${c.category.color}40` }}>{c.category.name}</Badge>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="py-3 pe-4 text-end font-medium text-red-500">{formatDA(c.amount)}</td>
                  <td className="py-3 pe-4 text-center">{c.isSalary ? <Badge variant="secondary">{t("charges.salary")}</Badge> : "—"}</td>
                  <td className="py-3 text-end">
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this charge?")) deleteCharge.mutate(c.id); }}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!charges.length && <p className="py-8 text-center text-sm text-gray-400">{t("charges.empty")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
