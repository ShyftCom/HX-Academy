"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Eye, EyeOff, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Slide {
  id: string; imageUrl: string; title: string | null; titleFr: string | null; titleAr: string | null;
  subtitle: string | null; subtitleFr: string | null; subtitleAr: string | null;
  ctaLabel: string | null; ctaUrl: string | null; position: number; isActive: boolean;
}

const EMPTY_FORM = {
  imageUrl: "", title: "", titleFr: "", titleAr: "",
  subtitle: "", subtitleFr: "", subtitleAr: "", ctaLabel: "", ctaUrl: "",
};

function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "slides");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) onChange(data.url);
      else toast.error("Upload failed");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <img src={value} alt="Slide" className="w-full h-48 object-cover" />
          <button
            onClick={() => onChange("")}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 transition-colors text-gray-500"
        >
          <Upload className="w-6 h-6" />
          <span className="text-sm">{uploading ? "Uploading..." : "Click to upload image"}</span>
          <span className="text-xs text-gray-400">JPG, PNG, WEBP • max 10MB</span>
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
          <Upload className="w-3.5 h-3.5 mr-1" /> {uploading ? "Uploading..." : "Replace image"}
        </Button>
      )}
    </div>
  );
}

export default function SlidesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<"new" | Slide | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tab, setTab] = useState("en");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: slides = [], isLoading } = useQuery<Slide[]>({
    queryKey: ["admin-slides"],
    queryFn: () => fetch("/api/website/slides?include_inactive=true").then((r) => r.json()),
  });

  const { mutate: createSlide, isPending: creating } = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) =>
      fetch("/api/website/slides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Slide added"); qc.invalidateQueries({ queryKey: ["admin-slides"] }); setModal(null); },
    onError: () => toast.error("Failed"),
  });

  const { mutate: updateSlide, isPending: updating } = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & typeof EMPTY_FORM) =>
      fetch(`/api/website/slides/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-slides"] }); setModal(null); },
    onError: () => toast.error("Failed"),
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/website/slides/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-slides"] }),
  });

  const { mutate: deleteSlide, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/website/slides/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-slides"] }); setDeleteId(null); },
    onError: () => toast.error("Failed"),
  });

  const openNew = () => { setForm(EMPTY_FORM); setTab("en"); setModal("new"); };
  const openEdit = (s: Slide) => {
    setForm({ imageUrl: s.imageUrl, title: s.title ?? "", titleFr: s.titleFr ?? "", titleAr: s.titleAr ?? "", subtitle: s.subtitle ?? "", subtitleFr: s.subtitleFr ?? "", subtitleAr: s.subtitleAr ?? "", ctaLabel: s.ctaLabel ?? "", ctaUrl: s.ctaUrl ?? "" });
    setTab("en");
    setModal(s);
  };

  const save = () => {
    if (!form.imageUrl) { toast.error("Please upload an image"); return; }
    if (modal === "new") createSlide(form);
    else if (modal) updateSlide({ id: (modal as Slide).id, ...form });
  };

  // Fetch all slides including inactive for admin
  const allSlides = Array.isArray(slides) ? slides : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Image Slider" description="Manage the image carousel shown on the public website.">
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add Slide</Button>
      </PageHeader>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : allSlides.length === 0 ? (
        <EmptyState icon={Upload} title="No slides yet" description="Add your first slide to display on the public website homepage." action={{ label: "Add Slide", onClick: openNew }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allSlides.map((slide) => (
            <div key={slide.id} className={`bg-white dark:bg-gray-800 border rounded-xl overflow-hidden transition-opacity ${slide.isActive ? "border-gray-200 dark:border-gray-700" : "border-gray-100 dark:border-gray-800 opacity-60"}`}>
              <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
                <img src={slide.imageUrl} alt={slide.title ?? "Slide"} className="w-full h-full object-cover" />
                {!slide.isActive && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded">Hidden</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                {slide.title && <p className="font-medium text-sm truncate">{slide.title}</p>}
                {slide.subtitle && <p className="text-xs text-gray-500 truncate">{slide.subtitle}</p>}
                <div className="flex items-center gap-1 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => openEdit(slide)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleActive({ id: slide.id, isActive: !slide.isActive })}>
                    {slide.isActive ? <EyeOff className="w-3.5 h-3.5 text-gray-500" /> : <Eye className="w-3.5 h-3.5 text-green-500" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteId(slide.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Dialog open onOpenChange={() => setModal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{modal === "new" ? "Add Slide" : "Edit Slide"}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <ImageUploader value={form.imageUrl} onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="en" className="flex-1">EN</TabsTrigger>
                  <TabsTrigger value="fr" className="flex-1">FR</TabsTrigger>
                  <TabsTrigger value="ar" className="flex-1">AR</TabsTrigger>
                </TabsList>
              </Tabs>

              {tab === "en" && (
                <div className="space-y-3">
                  <div><Label>Title (EN)</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Train with the best" /></div>
                  <div><Label>Subtitle (EN)</Label><Input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="Short description" /></div>
                </div>
              )}
              {tab === "fr" && (
                <div className="space-y-3">
                  <div><Label>Title (FR)</Label><Input value={form.titleFr} onChange={(e) => setForm((f) => ({ ...f, titleFr: e.target.value }))} /></div>
                  <div><Label>Subtitle (FR)</Label><Input value={form.subtitleFr} onChange={(e) => setForm((f) => ({ ...f, subtitleFr: e.target.value }))} /></div>
                </div>
              )}
              {tab === "ar" && (
                <div className="space-y-3" dir="rtl">
                  <div><Label>Title (AR)</Label><Input value={form.titleAr} onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))} /></div>
                  <div><Label>Subtitle (AR)</Label><Input value={form.subtitleAr} onChange={(e) => setForm((f) => ({ ...f, subtitleAr: e.target.value }))} /></div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><Label>CTA Button Label</Label><Input value={form.ctaLabel} onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))} placeholder="Join Now" /></div>
                <div><Label>CTA URL</Label><Input value={form.ctaUrl} onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))} placeholder="/apply" /></div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={save} disabled={creating || updating}>
                {creating || updating ? "Saving..." : "Save Slide"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Slide"
        description="This will permanently remove the slide."
        onConfirm={() => deleteId && deleteSlide(deleteId)}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
