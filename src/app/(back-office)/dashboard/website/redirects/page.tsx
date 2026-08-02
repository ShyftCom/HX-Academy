"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "react-i18next";

interface Redirect { id: string; fromPath: string; toPath: string; statusCode: number; isActive: boolean }

export default function RedirectsAdminPage() {
  const { t } = useTranslation("website");
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: redirects = [], isLoading } = useQuery<Redirect[]>({ queryKey: ["admin-redirects"], queryFn: () => fetch("/api/redirects").then((r) => r.json()) });

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => fetch("/api/redirects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromPath, toPath }) }).then(async (r) => {
      const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Failed"); return d;
    }),
    onSuccess: () => { toast.success(t("redirects.created")); qc.invalidateQueries({ queryKey: ["admin-redirects"] }); setCreating(false); setFromPath(""); setToPath(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => fetch(`/api/redirects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-redirects"] }),
  });
  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/redirects/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("common:toast.deleted")); qc.invalidateQueries({ queryKey: ["admin-redirects"] }); setDeleteId(null); },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("redirects.title")} description={t("redirects.subtitle")}>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {t("redirects.new")}</Button>
      </PageHeader>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Redirects are recorded here but are not yet automatically applied at runtime — this requires a small, carefully-tested addition to the site&apos;s routing middleware. See the delivery notes for details.</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">{t("common:ui.loading_alt")}</div>
      ) : redirects.length === 0 ? (
        <EmptyState icon={ArrowRightLeft} title={t("redirects.empty")} description={t("redirects.empty_body")} action={{ label: t("redirects.new"), onClick: () => setCreating(true) }} />
      ) : (
        <div className="space-y-2">
          {redirects.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
              <span className="font-mono text-gray-600 dark:text-gray-300">{r.fromPath}</span>
              <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="flex-1 truncate font-mono text-gray-600 dark:text-gray-300">{r.toPath}</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800">{r.statusCode}</span>
              <Switch checked={r.isActive} onCheckedChange={(v) => toggle({ id: r.id, isActive: v })} />
              <button onClick={() => setDeleteId(r.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("redirects.new")}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <div><Label>{t("redirects.from")}</Label><Input value={fromPath} onChange={(e) => setFromPath(e.target.value)} placeholder="/old-page" /></div>
            <div><Label>{t("redirects.to")}</Label><Input value={toPath} onChange={(e) => setToPath(e.target.value)} placeholder="/programmes/football-school" /></div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>{t("common:ui.cancel")}</Button>
            <Button onClick={() => create()} disabled={isPending || !fromPath || !toPath}>{isPending ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title={t("redirects.delete")} description={t("redirects.delete_body")} onConfirm={() => deleteId && remove(deleteId)} loading={deleting} variant="destructive" />
    </div>
  );
}
