"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SortableList } from "@/components/website/admin/SortableList";

interface Faq { id: string; question: string; answer: string; category: string | null; isPublished: boolean }

export default function FaqsAdminPage() {
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: faqs = [] } = useQuery<Faq[]>({ queryKey: ["admin-faqs"], queryFn: () => fetch("/api/faqs").then((r) => r.json()) });
  const [rows, setRows] = useState<Faq[] | null>(null);
  const list = rows ?? faqs;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-faqs"] });
  const { mutate: create } = useMutation({
    mutationFn: (category: string | null) => fetch("/api/faqs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "New question", answer: "<p>Answer</p>", category }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("FAQ added"); invalidate(); },
  });
  const { mutate: update } = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Faq>) => fetch(`/api/faqs/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => invalidate(),
  });
  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/faqs/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Deleted"); invalidate(); setDeleteId(null); },
  });

  const groups = list.reduce<Record<string, Faq[]>>((acc, f) => {
    const key = f.category ?? "uncategorized";
    (acc[key] ??= []).push(f);
    return acc;
  }, {});

  function handleReorder(category: string, next: Faq[]) {
    const rest = list.filter((f) => (f.category ?? "uncategorized") !== category);
    setRows([...rest, ...next]);
    fetch("/api/faqs/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: next.map((f, i) => ({ id: f.id, order: i })) }) }).then(invalidate);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="FAQs" description="Grouped by category — used on programme pages, venue pages, Squads, Contact and Pathway.">
        <Button onClick={() => create(null)}><Plus className="h-4 w-4" /> Add FAQ</Button>
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No FAQs yet" description="Add your first FAQ." action={{ label: "Add FAQ", onClick: () => create(null) }} />
      ) : (
        Object.entries(groups).map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{category}</h2>
            <SortableList
              items={items}
              onReorder={(next) => handleReorder(category, next)}
              renderItem={(f, dragHandle) => (
                <div className="mb-3 flex gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                  {dragHandle}
                  <div className="flex-1 space-y-2">
                    <Input defaultValue={f.question} onBlur={(e) => update({ id: f.id, question: e.target.value })} placeholder="Question" />
                    <Textarea defaultValue={f.answer} onBlur={(e) => update({ id: f.id, answer: e.target.value })} placeholder="Answer (HTML)" rows={2} />
                    <Input defaultValue={f.category ?? ""} onBlur={(e) => update({ id: f.id, category: e.target.value || null })} placeholder="Category" className="w-48" />
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <Switch checked={f.isPublished} onCheckedChange={(v) => update({ id: f.id, isPublished: v })} />
                    <button onClick={() => setDeleteId(f.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            />
          </div>
        ))
      )}

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete FAQ" description="This permanently removes this FAQ." onConfirm={() => deleteId && remove(deleteId)} loading={deleting} variant="destructive" />
    </div>
  );
}
