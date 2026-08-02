"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Newspaper, Eye, EyeOff, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "react-i18next";

interface NewsRow { id: string; slug: string; title: string; isPublished: boolean; isFeatured: boolean; category: { name: string } | null; publishedAt: string | null }

export default function NewsListPage() {
  const { t } = useTranslation("website");
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: articles = [], isLoading } = useQuery<NewsRow[]>({ queryKey: ["admin-news"], queryFn: () => fetch("/api/news").then((r) => r.json()) });

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => fetch("/api/news", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) }).then(async (r) => {
      const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Failed"); return d;
    }),
    onSuccess: () => { toast.success(t("news.created")); qc.invalidateQueries({ queryKey: ["admin-news"] }); setCreating(false); setTitle(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: togglePublish } = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      fetch(`/api/news/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-news"] }),
  });

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/news/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("common:toast.deleted")); qc.invalidateQueries({ queryKey: ["admin-news"] }); setDeleteId(null); },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("news.title")} description={t("news.subtitle")}>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {t("news.new")}</Button>
      </PageHeader>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">{t("common:ui.loading_alt")}</div>
      ) : articles.length === 0 ? (
        <EmptyState icon={Newspaper} title={t("news.empty")} description={t("news.empty_body")} action={{ label: t("news.new"), onClick: () => setCreating(true) }} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("common:ui.title_field")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("common:ui.category")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("common:ui.status")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {articles.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/website/news/${a.id}`} className="font-medium text-blue-600 hover:underline">{a.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.category?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePublish({ id: a.id, isPublished: !a.isPublished })}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${a.isPublished ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
                    >
                      {a.isPublished ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {a.isPublished ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-1">
                      <a href={`/fr/news/${a.slug}`} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button onClick={() => setDeleteId(a.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
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
          <DialogHeader><DialogTitle>{t("news.new")}</DialogTitle></DialogHeader>
          <DialogBody><Label>{t("common:ui.title_field")}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>{t("common:ui.cancel")}</Button>
            <Button onClick={() => create()} disabled={isPending || !title}>{isPending ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title={t("news.delete")} description={t("news.delete_body")} onConfirm={() => deleteId && remove(deleteId)} loading={deleting} variant="destructive" />
    </div>
  );
}
