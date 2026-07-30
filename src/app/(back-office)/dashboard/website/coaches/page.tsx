"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SortableList } from "@/components/website/admin/SortableList";
import { ImageUrlInput } from "@/components/website/admin/ImageUrlInput";

interface Coach { id: string; fullName: string; role: string | null; bio: string | null; photoUrl: string | null; isActive: boolean }

export default function CoachesAdminPage() {
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: coaches = [] } = useQuery<Coach[]>({ queryKey: ["admin-coaches"], queryFn: () => fetch("/api/coaches").then((r) => r.json()) });
  const [rows, setRows] = useState<Coach[] | null>(null);
  const list = rows ?? coaches;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-coaches"] });
  const { mutate: create } = useMutation({
    mutationFn: () => fetch("/api/coaches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "New Coach" }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Coach added"); invalidate(); },
  });
  const { mutate: update } = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Coach>) => fetch(`/api/coaches/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => invalidate(),
  });
  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/coaches/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Deleted"); invalidate(); setDeleteId(null); },
  });

  function handleReorder(next: Coach[]) {
    setRows(next);
    fetch("/api/coaches/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: next.map((c, i) => ({ id: c.id, order: i })) }) }).then(invalidate);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Coaches" description="Public-facing coach profiles shown on programme pages and Who We Are.">
        <Button onClick={() => create()}><Plus className="h-4 w-4" /> Add Coach</Button>
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState icon={UserCheck} title="No coaches yet" description="Add your first coach profile." action={{ label: "Add Coach", onClick: () => create() }} />
      ) : (
        <SortableList
          items={list}
          onReorder={handleReorder}
          renderItem={(c, dragHandle) => (
            <div className="mb-3 flex gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              {dragHandle}
              <div className="w-40 shrink-0">
                <ImageUrlInput value={c.photoUrl ?? ""} onChange={(url) => update({ id: c.id, photoUrl: url })} />
              </div>
              <div className="flex-1 space-y-2">
                <Input defaultValue={c.fullName} onBlur={(e) => update({ id: c.id, fullName: e.target.value })} placeholder="Full name" />
                <Input defaultValue={c.role ?? ""} onBlur={(e) => update({ id: c.id, role: e.target.value })} placeholder="Role (e.g. Head of Coaching)" />
                <Textarea defaultValue={c.bio ?? ""} onBlur={(e) => update({ id: c.id, bio: e.target.value })} placeholder="Short bio" rows={2} />
              </div>
              <div className="flex flex-col items-end justify-between">
                <Switch checked={c.isActive} onCheckedChange={(v) => update({ id: c.id, isActive: v })} />
                <button onClick={() => setDeleteId(c.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        />
      )}

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete coach" description="This permanently removes the coach profile." onConfirm={() => deleteId && remove(deleteId)} loading={deleting} variant="destructive" />
    </div>
  );
}
