"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, GripVertical, Trash2, Edit, ChevronUp, ChevronDown, ClipboardList, X } from "lucide-react";

const FIELD_TYPES = ["text", "number", "phone", "email", "select", "checkbox", "radio", "textarea", "file"];

export default function FormBuilderPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editField, setEditField] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", fieldType: "text", placeholder: "", isRequired: false, options: [] as string[] });
  const [newOption, setNewOption] = useState("");

  const { data: fields, isLoading } = useQuery({
    queryKey: ["form-fields"],
    queryFn: () => fetch("/api/form-fields").then((r) => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editField ? `/api/form-fields/${editField.id}` : "/api/form-fields";
      const res = await fetch(url, { method: editField ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast.success(editField ? "Field updated" : "Field added"); qc.invalidateQueries({ queryKey: ["form-fields"] }); setModalOpen(false); setEditField(null); setForm({ label: "", fieldType: "text", placeholder: "", isRequired: false, options: [] }); },
    onError: () => toast.error("Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/form-fields/${id}`, { method: "DELETE" }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); }),
    onSuccess: () => { toast.success("Field deleted"); qc.invalidateQueries({ queryKey: ["form-fields"] }); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const moveMutation = useMutation({
    mutationFn: (items: { id: string; order: number }[]) =>
      fetch("/api/form-fields", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["form-fields"] }),
    onError: () => toast.error("Reorder failed"),
  });

  const openAdd = () => { setEditField(null); setForm({ label: "", fieldType: "text", placeholder: "", isRequired: false, options: [] }); setModalOpen(true); };
  const openEdit = (f: any) => {
    setEditField(f);
    setForm({ label: f.label, fieldType: f.fieldType, placeholder: f.placeholder ?? "", isRequired: f.isRequired, options: f.options ? JSON.parse(f.options) : [] });
    setModalOpen(true);
  };

  const moveField = (idx: number, dir: "up" | "down") => {
    if (!fields) return;
    const sorted = [...fields].sort((a: any, b: any) => a.order - b.order);
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const items = sorted.map((f: any, i: number) => {
      if (i === idx) return { id: f.id, order: sorted[newIdx].order };
      if (i === newIdx) return { id: f.id, order: sorted[idx].order };
      return { id: f.id, order: f.order };
    });
    moveMutation.mutate(items);
  };

  const needsOptions = ["select", "radio", "checkbox"].includes(form.fieldType);

  return (
    <div className="space-y-5">
      <PageHeader title="Order Form Builder" description="Customize the COD order form fields">
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Field</Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Form Fields</h3>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
          ) : fields?.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12 dark:border-gray-700">
              <ClipboardList className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No form fields yet</p>
            </div>
          ) : (
            [...(fields ?? [])].sort((a: any, b: any) => a.order - b.order).map((field: any, idx: number) => (
              <div key={field.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{field.label}</p>
                    <Badge variant="outline" className="text-xs">{field.fieldType}</Badge>
                    {field.isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    {field.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                  </div>
                  {field.placeholder && <p className="text-xs text-gray-400 mt-0.5">Placeholder: {field.placeholder}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon-sm" onClick={() => moveField(idx, "up")} disabled={idx === 0}><ChevronUp className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => moveField(idx, "down")} disabled={idx === (fields?.length ?? 0) - 1}><ChevronDown className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(field)}><Edit className="h-3.5 w-3.5" /></Button>
                  {!field.isDefault && <Button variant="ghost" size="icon-sm" className="text-red-500" onClick={() => setDeleteId(field.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              </div>
            ))
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Form Preview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[...(fields ?? [])].sort((a: any, b: any) => a.order - b.order).map((field: any) => (
              <div key={field.id}>
                <label className="mb-1 block text-sm font-medium text-gray-700">{field.label}{field.isRequired && <span className="text-red-500 ml-1">*</span>}</label>
                {field.fieldType === "textarea" ? (
                  <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder={field.placeholder ?? ""} rows={2} readOnly />
                ) : field.fieldType === "select" ? (
                  <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"><option>Select...</option></select>
                ) : (
                  <input type={field.fieldType} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder={field.placeholder ?? ""} readOnly />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{editField ? "Edit Field" : "Add Form Field"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input label="Field Label *" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Full Name" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Field Type</label>
              <Select value={form.fieldType} onValueChange={(v) => setForm({ ...form, fieldType: v, options: [] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!needsOptions && <Input label="Placeholder" value={form.placeholder} onChange={(e) => setForm({ ...form, placeholder: e.target.value })} placeholder="Enter placeholder text" />}
            {needsOptions && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Options</label>
                <div className="space-y-2 mb-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-700">{opt}</span>
                      <Button variant="ghost" size="icon-sm" onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Add option..." className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={() => { if (newOption.trim()) { setForm({ ...form, options: [...form.options, newOption.trim()] }); setNewOption(""); } }}>Add</Button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.isRequired} onCheckedChange={(v) => setForm({ ...form, isRequired: v })} />
              <span className="text-sm text-gray-700 dark:text-gray-300">Required field</span>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.label}>{editField ? "Save" : "Add Field"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete Field" description="This field will be removed from the order form." confirmLabel="Delete" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
