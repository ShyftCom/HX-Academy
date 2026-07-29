"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SortableList } from "@/components/website/admin/SortableList";

interface Level { id: string; name: string; ageRangeLabel: string | null; color: string; description: string | null; isActive: boolean }

export default function PathwayAdminPage() {
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: levels = [] } = useQuery<Level[]>({ queryKey: ["admin-pathway"], queryFn: () => fetch("/api/pathway").then((r) => r.json()) });
  const [rows, setRows] = useState<Level[] | null>(null);
  const list = rows ?? levels;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-pathway"] });
  const { mutate: create } = useMutation({
    mutationFn: () => fetch("/api/pathway", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New Stage" }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Stage added"); invalidate(); },
  });
  const { mutate: update } = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Level>) => fetch(`/api/pathway/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => invalidate(),
  });
  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/pathway/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Deleted"); invalidate(); setDeleteId(null); },
  });

  function handleReorder(next: Level[]) {
    setRows(next);
    fetch("/api/pathway/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: next.map((l, i) => ({ id: l.id, order: i })) }) }).then(invalidate);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Player Pathway" description="Stages shown on the public Pathway timeline, in order.">
        <Button onClick={() => create()}><Plus className="h-4 w-4" /> Add Stage</Button>
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No pathway stages yet" description="Add your first stage." action={{ label: "Add Stage", onClick: () => create() }} />
      ) : (
        <SortableList
          items={list}
          onReorder={handleReorder}
          renderItem={(l, dragHandle) => (
            <div className="mb-3 flex gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              {dragHandle}
              <input type="color" defaultValue={l.color} onBlur={(e) => update({ id: l.id, color: e.target.value })} className="h-10 w-10 shrink-0 cursor-pointer rounded border border-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Input defaultValue={l.name} onBlur={(e) => update({ id: l.id, name: e.target.value })} placeholder="Stage name" className="flex-1" />
                  <Input defaultValue={l.ageRangeLabel ?? ""} onBlur={(e) => update({ id: l.id, ageRangeLabel: e.target.value })} placeholder="Age range" className="w-40" />
                </div>
                <Textarea defaultValue={l.description ?? ""} onBlur={(e) => update({ id: l.id, description: e.target.value })} placeholder="Description" rows={2} />
              </div>
              <div className="flex flex-col items-end justify-between">
                <Switch checked={l.isActive} onCheckedChange={(v) => update({ id: l.id, isActive: v })} />
                <button onClick={() => setDeleteId(l.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        />
      )}

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete stage" description="This permanently removes this pathway stage." onConfirm={() => deleteId && remove(deleteId)} loading={deleting} variant="destructive" />
    </div>
  );
}
