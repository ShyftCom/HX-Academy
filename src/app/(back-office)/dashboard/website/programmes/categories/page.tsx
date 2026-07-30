"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { SortableList } from "@/components/website/admin/SortableList";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface Category { id: string; name: string; colorTag: string; isActive: boolean; _count: { programmes: number } }

export default function ProgrammeCategoriesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["admin-programme-categories-full"], queryFn: () => fetch("/api/programmes/categories").then((r) => r.json()) });
  const [rows, setRows] = useState<Category[] | null>(null);
  const list = rows ?? categories;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-programme-categories-full"] });

  const { mutate: create } = useMutation({
    mutationFn: () => fetch("/api/programmes/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Category added"); invalidate(); setNewName(""); },
  });
  const { mutate: update } = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Category>) => fetch(`/api/programmes/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => invalidate(),
  });
  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => fetch(`/api/programmes/categories/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Deleted"); invalidate(); setDeleteId(null); },
  });

  function handleReorder(next: Category[]) {
    setRows(next);
    next.forEach((c, i) => update({ id: c.id, order: i } as Partial<Category> & { id: string }));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Programme Categories">
        <Button variant="outline" onClick={() => router.push("/dashboard/website/programmes")}><ArrowLeft className="h-4 w-4" /> Back to Programmes</Button>
      </PageHeader>

      <div className="flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category name" />
        <Button onClick={() => create()} disabled={!newName}><Plus className="h-4 w-4" /> Add</Button>
      </div>

      {list.length > 0 && (
        <SortableList
          items={list}
          onReorder={handleReorder}
          renderItem={(c, dragHandle) => (
            <div className="mb-2 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              {dragHandle}
              <Input defaultValue={c.name} onBlur={(e) => update({ id: c.id, name: e.target.value })} className="flex-1" />
              <span className="text-xs text-gray-400">{c._count.programmes} programme(s)</span>
              <button onClick={() => setDeleteId(c.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        />
      )}

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete category" description="Programmes in this category will become uncategorized." onConfirm={() => deleteId && remove(deleteId)} variant="destructive" />
    </div>
  );
}
