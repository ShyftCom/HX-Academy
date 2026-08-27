"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, Edit, Trash2, Folder } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permission-names";

export default function CategoriesPage() {
  const { t } = useTranslation("store");

  // Mirrors the gates the store routes now enforce. The store nav needs
  // store:view, so a role granted only that would otherwise be shown controls
  // that can answer nothing but 403.
  const { can } = usePermissions();
  const canCreate = can(PERMISSIONS.STORE_CREATE);
  const canEdit = can(PERMISSIONS.STORE_EDIT);
  const canDelete = can(PERMISSIONS.STORE_DELETE);

  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["product-categories"],
    queryFn: () => fetch("/api/products/categories").then((r) => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editCat ? `/api/products/categories/${editCat.id}` : "/api/products/categories";
      const res = await fetch(url, { method: editCat ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast.success(editCat ? "Category updated" : "Category created"); qc.invalidateQueries({ queryKey: ["product-categories"] }); setModalOpen(false); setForm({ name: "", description: "" }); setEditCat(null); },
    onError: () => toast.error(t("common:toast.save_failed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/products/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success(t("common:toast.deleted")); qc.invalidateQueries({ queryKey: ["product-categories"] }); setDeleteId(null); },
    onError: () => toast.error(t("common:toast.delete_failed")),
  });

  const openAdd = () => { setEditCat(null); setForm({ name: "", description: "" }); setModalOpen(true); };
  const openEdit = (c: any) => { setEditCat(c); setForm({ name: c.name, description: c.description ?? "" }); setModalOpen(true); };

  const columns = [
    { key: "name", header: "Name", cell: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: "description", header: "Description", cell: (r: any) => r.description ?? "—" },
    { key: "status", header: "Status", cell: (r: any) => <Badge variant={r.isActive ? "success" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
    { key: "actions", header: "", cell: (r: any) => (
      <div className="flex gap-2">
        {canEdit && <Button variant="outline" size="sm" onClick={() => openEdit(r)}><Edit className="h-3.5 w-3.5 me-1" />{t("common:ui.edit")}</Button>}
        {canDelete && <Button variant="outline" size="sm" onClick={() => setDeleteId(r.id)} className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t("categories.title")} description={t("categories.subtitle")}>
        {canCreate && <Button onClick={openAdd}><Plus className="me-2 h-4 w-4" />{t("categories.add")}</Button>}
      </PageHeader>

      {!isLoading && categories?.length === 0 ? (
        <EmptyState icon={Folder} title={t("categories.empty")} description={t("categories.empty_body")} action={{ label: t("categories.add"), onClick: openAdd }} />
      ) : (
        <DataTable columns={columns} data={categories ?? []} loading={isLoading} emptyMessage={t("categories.empty")} />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{editCat ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input label={t("categories.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("categories.name_ph")} />
            <Textarea label={t("common:ui.description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("categories.description_ph")} rows={2} />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t("common:ui.cancel")}</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name}>{editCat ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title={t("categories.delete_title")} description={t("categories.delete_body")} confirmLabel={t("common:ui.delete")} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
