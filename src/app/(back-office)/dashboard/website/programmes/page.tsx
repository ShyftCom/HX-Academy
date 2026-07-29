"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trophy, Eye, EyeOff, Trash2, ExternalLink, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

interface ProgrammeRow {
  id: string; slug: string; name: string; isPubliclyListed: boolean; isFeatured: boolean;
  category: { name: string } | null; _count: { schedules: number; leads: number };
}

export default function ProgrammesListPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: programmes = [], isLoading } = useQuery<ProgrammeRow[]>({
    queryKey: ["admin-programmes"],
    queryFn: () => fetch("/api/programmes").then((r) => r.json()),
  });

  const { mutate: createProgramme, isPending } = useMutation({
    mutationFn: () => fetch("/api/programmes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      return d;
    }),
    onSuccess: () => { toast.success("Programme created"); qc.invalidateQueries({ queryKey: ["admin-programmes"] }); setCreating(false); setName(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: togglePublish } = useMutation({
    mutationFn: ({ id, isPubliclyListed }: { id: string; isPubliclyListed: boolean }) =>
      fetch(`/api/programmes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPubliclyListed }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-programmes"] }),
  });

  const { mutate: deleteProgramme, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/programmes/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Programme deleted"); qc.invalidateQueries({ queryKey: ["admin-programmes"] }); setDeleteId(null); },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Programmes" description="Manage every football programme shown on the public site, including schedules, coaches and pricing.">
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/dashboard/website/programmes/categories"><Settings2 className="h-4 w-4" /> Categories</Link></Button>
          <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New Programme</Button>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading…</div>
      ) : programmes.length === 0 ? (
        <EmptyState icon={Trophy} title="No programmes yet" description="Create your first programme to show it on the public site." action={{ label: "New Programme", onClick: () => setCreating(true) }} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-start font-medium">Name</th>
                <th className="px-4 py-3 text-start font-medium">Category</th>
                <th className="px-4 py-3 text-start font-medium">Schedule rows</th>
                <th className="px-4 py-3 text-start font-medium">Leads</th>
                <th className="px-4 py-3 text-start font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {programmes.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/website/programmes/${p.id}`} className="font-medium text-blue-600 hover:underline">{p.name}</Link>
                    {p.isFeatured && <span className="ms-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">FEATURED</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{p._count.schedules}</td>
                  <td className="px-4 py-3 text-gray-500">{p._count.leads}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePublish({ id: p.id, isPubliclyListed: !p.isPubliclyListed })}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${p.isPubliclyListed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
                    >
                      {p.isPubliclyListed ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {p.isPubliclyListed ? "Live" : "Draft"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-1">
                      <a href={`/fr/programmes/${p.slug}`} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button onClick={() => setDeleteId(p.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Programme</DialogTitle></DialogHeader>
          <DialogBody>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Football School" />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={() => createProgramme()} disabled={isPending || !name}>{isPending ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Programme"
        description="This permanently removes the programme, its schedule and its FAQs."
        onConfirm={() => deleteId && deleteProgramme(deleteId)}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
