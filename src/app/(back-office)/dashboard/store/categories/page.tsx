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

export default function CategoriesPage() {
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
    onError: () => toast.error("Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/products/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["product-categories"] }); setDeleteId(null); },
    onError: () => toast.error("Delete failed"),
  });

  const openAdd = () => { setEditCat(null); setForm({ name: "", description: "" }); setModalOpen(true); };
  const openEdit = (c: any) => { setEditCat(c); setForm({ name: c.name, description: c.description ?? "" }); setModalOpen(true); };

  const columns = [
    { key: "name", header: "Name", cell: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: "description", header: "Description", cell: (r: any) => r.description ?? "—" },
    { key: "status", header: "Status", cell: (r: any) => <Badge variant={r.isActive ? "success" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
    { key: "actions", header: "", cell: (r: any) => (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => openEdit(r)}><Edit className="h-3.5 w-3.5 mr-1" />Edit</Button>
        <Button variant="outline" size="sm" onClick={() => setDeleteId(r.id)} className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Product Categories" description="Organize products by category">
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Category</Button>
      </PageHeader>

      {!isLoading && categories?.length === 0 ? (
        <EmptyState icon={Folder} title="No categories" description="Create your first product category" action={{ label: "Add Category", onClick: openAdd }} />
      ) : (
        <DataTable columns={columns} data={categories ?? []} loading={isLoading} emptyMessage="No categories" />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{editCat ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jerseys" />
            <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={2} />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name}>{editCat ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete Category" description="Products in this category won't be deleted, but will have no category." confirmLabel="Delete" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
