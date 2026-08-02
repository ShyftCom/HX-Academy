"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, Upload, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "react-i18next";

interface Sponsor {
  id: string; name: string; logoUrl: string; websiteUrl: string | null; position: number; isActive: boolean;
}

const EMPTY_FORM = { name: "", logoUrl: "", websiteUrl: "" };

function LogoUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { t } = useTranslation("website");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "sponsors");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) onChange(data.url);
      else toast.error(t("common:toast.upload_failed"));
    } catch {
      toast.error(t("common:toast.upload_failed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative group w-24 h-16 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white flex items-center justify-center p-2">
          <img src={value} alt={t("sponsors.logo")} className="max-w-full max-h-full object-contain" />
          <button
            onClick={() => onChange("")}
            className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-24 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-blue-400 transition-colors text-gray-500"
        >
          <Upload className="w-4 h-4" />
          <span className="text-xs">{uploading ? "..." : "Upload"}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />
      {value && (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="w-3 h-3 mr-1" /> {uploading ? "Uploading..." : "Replace"}
        </Button>
      )}
    </div>
  );
}

export default function SponsorsPage() {
  const { t } = useTranslation("website");
  const qc = useQueryClient();
  const [modal, setModal] = useState<"new" | Sponsor | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: sponsors = [], isLoading } = useQuery<Sponsor[]>({
    queryKey: ["admin-sponsors"],
    queryFn: () => fetch("/api/website/sponsors").then((r) => r.json()),
  });

  const { mutate: createSponsor, isPending: creating } = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) =>
      fetch("/api/website/sponsors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("sponsors.added")); qc.invalidateQueries({ queryKey: ["admin-sponsors"] }); setModal(null); },
    onError: () => toast.error(t("common:toast.failed")),
  });

  const { mutate: updateSponsor, isPending: updating } = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & typeof EMPTY_FORM) =>
      fetch(`/api/website/sponsors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("common:toast.saved")); qc.invalidateQueries({ queryKey: ["admin-sponsors"] }); setModal(null); },
    onError: () => toast.error(t("common:toast.failed")),
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/website/sponsors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-sponsors"] }),
  });

  const { mutate: deleteSponsor, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/website/sponsors/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("common:toast.deleted")); qc.invalidateQueries({ queryKey: ["admin-sponsors"] }); setDeleteId(null); },
    onError: () => toast.error(t("common:toast.failed")),
  });

  const openNew = () => { setForm(EMPTY_FORM); setModal("new"); };
  const openEdit = (s: Sponsor) => { setForm({ name: s.name, logoUrl: s.logoUrl, websiteUrl: s.websiteUrl ?? "" }); setModal(s); };

  const save = () => {
    if (!form.name) { toast.error(t("sponsors.name_required")); return; }
    if (!form.logoUrl) { toast.error(t("sponsors.need_logo")); return; }
    if (modal === "new") createSponsor(form);
    else if (modal) updateSponsor({ id: (modal as Sponsor).id, ...form });
  };

  const allSponsors = Array.isArray(sponsors) ? sponsors : [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("sponsors.title")} description={t("sponsors.subtitle")}>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> {t("sponsors.add")}</Button>
      </PageHeader>

      {/* Live preview strip */}
      {allSponsors.filter((s) => s.isActive).length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase font-medium mb-3">{t("sponsors.preview")}</p>
          <div className="flex items-center gap-8 overflow-x-auto pb-2">
            {allSponsors.filter((s) => s.isActive).map((s) => (
              <img key={s.id} src={s.logoUrl} alt={s.name} className="h-10 object-contain opacity-70 hover:opacity-100 transition-opacity flex-shrink-0" />
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">{t("common:ui.loading")}</div>
      ) : allSponsors.length === 0 ? (
        <EmptyState icon={Upload} title={t("sponsors.empty")} description={t("sponsors.empty_body")} action={{ label: t("sponsors.add"), onClick: openNew }} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {allSponsors.map((sponsor) => (
            <div key={sponsor.id} className={`bg-white dark:bg-gray-800 border rounded-xl p-4 flex flex-col items-center gap-3 text-center transition-opacity ${sponsor.isActive ? "border-gray-200 dark:border-gray-700" : "border-gray-100 dark:border-gray-800 opacity-50"}`}>
              <div className="w-full h-14 flex items-center justify-center">
                <img src={sponsor.logoUrl} alt={sponsor.name} className="max-w-full max-h-full object-contain" />
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-full">{sponsor.name}</p>
              {sponsor.websiteUrl && (
                <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <div className="flex gap-1 w-full">
                <Button size="sm" variant="outline" className="flex-1 text-xs h-6 px-1" onClick={() => openEdit(sponsor)}>{t("common:ui.edit")}</Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => toggleActive({ id: sponsor.id, isActive: !sponsor.isActive })}>
                  {sponsor.isActive ? <EyeOff className="w-3 h-3 text-gray-400" /> : <Eye className="w-3 h-3 text-green-500" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => setDeleteId(sponsor.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Dialog open onOpenChange={() => setModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{modal === "new" ? "Add Sponsor" : "Edit Sponsor"}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div>
                <Label>{t("sponsors.logo_req")}</Label>
                <div className="mt-1">
                  <LogoUploader value={form.logoUrl} onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))} />
                </div>
              </div>
              <div>
                <Label>{t("sponsors.name_req")}</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("sponsors.name_ph")} className="mt-1" />
              </div>
              <div>
                <Label>{t("sponsors.url")}</Label>
                <Input value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://sponsor.com" className="mt-1" />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>{t("common:ui.cancel")}</Button>
              <Button onClick={save} disabled={creating || updating}>
                {creating || updating ? "Saving..." : "Save Sponsor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title={t("sponsors.remove")}
        description={t("sponsors.remove_body")}
        onConfirm={() => deleteId && deleteSponsor(deleteId)}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
