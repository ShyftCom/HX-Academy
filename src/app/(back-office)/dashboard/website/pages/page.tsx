"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, FileText, ExternalLink, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "react-i18next";

interface LandingPageRow {
  id: string;
  slug: string;
  title: string | null;
  isPublished: boolean;
  _count: { sections: number };
}

export default function WebsitePagesPage() {
  const { t } = useTranslation("website");
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: pages = [], isLoading } = useQuery<LandingPageRow[]>({
    queryKey: ["admin-pages"],
    queryFn: () => fetch("/api/pages").then((r) => r.json()),
  });

  const { mutate: createPage, isPending } = useMutation({
    mutationFn: () =>
      fetch("/api/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle, slug: newSlug }) }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed");
        return data;
      }),
    onSuccess: () => { toast.success(t("pages.created")); qc.invalidateQueries({ queryKey: ["admin-pages"] }); setCreating(false); setNewTitle(""); setNewSlug(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: togglePublish } = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      fetch(`/api/pages/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pages"] }),
  });

  const { mutate: deletePage, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/pages/${id}`, { method: "DELETE" }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed");
      return data;
    }),
    onSuccess: () => { toast.success(t("pages.deleted")); qc.invalidateQueries({ queryKey: ["admin-pages"] }); setDeleteId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("pages.title")} description={t("pages.subtitle")}>
        <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> {t("pages.new")}</Button>
      </PageHeader>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">{t("common:ui.loading_alt")}</div>
      ) : pages.length === 0 ? (
        <EmptyState icon={FileText} title={t("pages.empty")} description={t("pages.empty_body")} action={{ label: t("pages.new"), onClick: () => setCreating(true) }} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-start text-xs uppercase text-gray-500 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("common:ui.title_field")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("pages.slug")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("pages.sections")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("common:ui.status")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/website/pages/${p.id}`} className="font-medium text-blue-600 hover:underline">
                      {p.title || p.slug}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">/{p.slug}</td>
                  <td className="px-4 py-3 text-gray-500">{p._count.sections}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePublish({ id: p.id, isPublished: !p.isPublished })}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${p.isPublished ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
                    >
                      {p.isPublished ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {p.isPublished ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-1">
                      <a href={`/fr/${p.slug === "home" ? "" : p.slug}`} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {p.slug !== "home" && (
                        <button onClick={() => setDeleteId(p.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
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
          <DialogHeader><DialogTitle>{t("pages.new")}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <Label>{t("common:ui.title_field")}</Label>
              <Input
                value={newTitle}
                onChange={(e) => { setNewTitle(e.target.value); if (!newSlug) setNewSlug(slugify(e.target.value)); }}
                placeholder={t("pages.name_ph")}
              />
            </div>
            <div>
              <Label>{t("pages.url_slug")}</Label>
              <Input value={newSlug} onChange={(e) => setNewSlug(slugify(e.target.value))} placeholder="who-we-are" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>{t("common:ui.cancel")}</Button>
            <Button onClick={() => createPage()} disabled={isPending || !newSlug}>{isPending ? "Creating…" : "Create Page"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title={t("pages.delete")}
        description={t("pages.delete_body")}
        onConfirm={() => deleteId && deletePage(deleteId)}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
