"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, Plus, Trash2, Eye, EyeOff, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocaleTextInput } from "@/components/website/admin/LocaleTextInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SortableList } from "@/components/website/admin/SortableList";
import { SectionContentForm } from "@/components/website/admin/SectionContentForm";
import { SECTION_TYPES, SECTION_TYPE_KEYS, type SectionType } from "@/components/website/sections/sectionTypes";
import { SECTION_FIELD_SCHEMAS } from "@/components/website/sections/sectionFieldSchemas";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface SectionRow {
  id: string;
  type: string;
  title: string | null;
  content: string;
  order: number;
  isEnabled: boolean;
}
interface PageDetail {
  id: string; slug: string; title: string | null; isPublished: boolean;
  metaTitle: string | null; metaTitleFr: string | null; metaTitleAr: string | null;
  metaDescription: string | null; metaDescriptionFr: string | null; metaDescriptionAr: string | null;
  breadcrumbLabel: string | null; breadcrumbLabelFr: string | null; breadcrumbLabelAr: string | null;
  sections: SectionRow[];
}

function parseContent(raw: string): Record<string, unknown> {
  try { const p = JSON.parse(raw); return p && typeof p === "object" ? p : {}; } catch { return {}; }
}

function SectionEditorRow({
  section, expanded, onToggleExpand, onSave, onDelete, onToggleEnabled, dragHandle,
}: {
  section: SectionRow;
  expanded: boolean;
  onToggleExpand: () => void;
  onSave: (content: Record<string, unknown>) => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  dragHandle: React.ReactNode;
}) {
  const { t } = useTranslation("website");
  const [content, setContent] = useState<Record<string, unknown>>(() => parseContent(section.content));
  const [dirty, setDirty] = useState(false);
  const meta = SECTION_TYPES[section.type as SectionType];
  const schema = SECTION_FIELD_SCHEMAS[section.type as SectionType];

  useEffect(() => { setContent(parseContent(section.content)); setDirty(false); }, [section.content]);

  return (
    <div className={cn("mb-3 rounded-xl border bg-white dark:bg-gray-900", section.isEnabled ? "border-gray-200 dark:border-gray-700" : "border-gray-100 opacity-60 dark:border-gray-800")}>
      <div className="flex items-center gap-2 px-3 py-3">
        {dragHandle}
        <button type="button" onClick={onToggleExpand} className="flex flex-1 items-center gap-2 text-start">
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-gray-400 transition-transform", expanded && "rotate-180")} />
          <span className="font-medium text-gray-900 dark:text-gray-100">{meta?.label ?? section.type}</span>
          <span className="text-xs text-gray-400">{meta?.description}</span>
        </button>
        <Switch checked={section.isEnabled} onCheckedChange={onToggleEnabled} aria-label={t("pages.enabled")} />
        <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 p-4 dark:border-gray-800">
          {schema ? (
            <SectionContentForm schema={schema} value={content} onChange={(next) => { setContent(next); setDirty(true); }} />
          ) : meta?.isDataDriven ? (
            <p className="text-sm text-gray-500">{t("pages.auto_section")}</p>
          ) : (
            <p className="text-sm text-gray-500">{t("pages.no_editor")}</p>
          )}
          {schema && (
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={() => { onSave(content); setDirty(false); }} disabled={!dirty}>
                <Save className="h-3.5 w-3.5" /> {t("pages.save_section")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PageBuilderPage() {
  const { t } = useTranslation("website");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: page, isLoading } = useQuery<PageDetail>({
    queryKey: ["admin-page", id],
    queryFn: () => fetch(`/api/pages/${id}`).then((r) => r.json()),
  });

  const [sections, setSections] = useState<SectionRow[]>([]);
  useEffect(() => { if (page?.sections) setSections(page.sections); }, [page?.sections]);

  const [meta, setMeta] = useState({ title: "", slug: "", metaTitle: "", metaTitleFr: "", metaTitleAr: "", metaDescription: "", metaDescriptionFr: "", metaDescriptionAr: "", breadcrumbLabel: "", breadcrumbLabelFr: "", breadcrumbLabelAr: "" });
  useEffect(() => {
    if (page) setMeta({ title: page.title ?? "", slug: page.slug, metaTitle: page.metaTitle ?? "", metaTitleFr: page.metaTitleFr ?? "", metaTitleAr: page.metaTitleAr ?? "", metaDescription: page.metaDescription ?? "", metaDescriptionFr: page.metaDescriptionFr ?? "", metaDescriptionAr: page.metaDescriptionAr ?? "", breadcrumbLabel: page.breadcrumbLabel ?? "", breadcrumbLabelFr: page.breadcrumbLabelFr ?? "", breadcrumbLabelAr: page.breadcrumbLabelAr ?? "" });
  }, [page]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-page", id] });

  const { mutate: savePageMeta, isPending: savingMeta } = useMutation({
    mutationFn: () => fetch(`/api/pages/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(meta) }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("pages.settings_saved")); invalidate(); setSettingsOpen(false); },
    onError: () => toast.error(t("common:toast.save_failed")),
  });

  const { mutate: togglePublish } = useMutation({
    mutationFn: (isPublished: boolean) => fetch(`/api/pages/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished }) }).then((r) => r.json()),
    onSuccess: () => { toast.success(page?.isPublished ? "Unpublished" : "Published"); invalidate(); },
  });

  const { mutate: addSection } = useMutation({
    mutationFn: (type: SectionType) =>
      fetch(`/api/pages/${id}/sections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, content: SECTION_TYPES[type].defaultContent }) }).then((r) => r.json()),
    onSuccess: (created: SectionRow) => { toast.success(t("pages.section_added")); invalidate(); setAddOpen(false); setExpandedId(created.id); },
    onError: () => toast.error(t("pages.section_add_failed")),
  });

  const { mutate: saveSectionContent } = useMutation({
    mutationFn: ({ sectionId, content }: { sectionId: string; content: Record<string, unknown> }) =>
      fetch(`/api/pages/${id}/sections/${sectionId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("pages.section_saved")); invalidate(); },
    onError: () => toast.error(t("common:toast.save_failed")),
  });

  const { mutate: toggleSectionEnabled } = useMutation({
    mutationFn: ({ sectionId, isEnabled }: { sectionId: string; isEnabled: boolean }) =>
      fetch(`/api/pages/${id}/sections/${sectionId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isEnabled }) }).then((r) => r.json()),
    onSuccess: () => invalidate(),
  });

  const { mutate: deleteSection, isPending: deletingSection } = useMutation({
    mutationFn: (sectionId: string) => fetch(`/api/pages/${id}/sections/${sectionId}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("pages.section_removed")); invalidate(); setDeleteId(null); },
  });

  const { mutate: persistOrder } = useMutation({
    mutationFn: (items: { id: string; order: number }[]) =>
      fetch(`/api/pages/${id}/sections/reorder`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) }).then((r) => r.json()),
  });

  function handleReorder(next: SectionRow[]) {
    setSections(next);
    persistOrder(next.map((s, i) => ({ id: s.id, order: i })));
  }

  if (isLoading || !page) return <div className="py-12 text-center text-gray-500">{t("common:ui.loading_alt")}</div>;

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/website/pages")} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">{page.title || page.slug}</h1>
            <p className="font-mono text-xs text-gray-400">/{page.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-3.5 w-3.5" /> {t("pages.settings")}
          </Button>
          <Button size="sm" variant={page.isPublished ? "outline" : "default"} onClick={() => togglePublish(!page.isPublished)}>
            {page.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {page.isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-500 dark:border-gray-700">
          No sections yet. Add your first section to start building this page.
        </div>
      ) : (
        <SortableList
          items={sections}
          onReorder={handleReorder}
          renderItem={(section, dragHandle) => (
            <SectionEditorRow
              section={section}
              expanded={expandedId === section.id}
              onToggleExpand={() => setExpandedId(expandedId === section.id ? null : section.id)}
              onSave={(content) => saveSectionContent({ sectionId: section.id, content })}
              onDelete={() => setDeleteId(section.id)}
              onToggleEnabled={(enabled) => toggleSectionEnabled({ sectionId: section.id, isEnabled: enabled })}
              dragHandle={dragHandle}
            />
          )}
        />
      )}

      <Button variant="outline" onClick={() => setAddOpen(true)} className="w-full border-dashed">
        <Plus className="h-4 w-4" /> {t("pages.add_section")}
      </Button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("pages.add_a_section")}</DialogTitle></DialogHeader>
          <DialogBody>
            <div className="grid max-h-96 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {SECTION_TYPE_KEYS.map((type) => (
                <button
                  key={type}
                  onClick={() => addSection(type)}
                  className="rounded-lg border border-gray-200 p-3 text-start hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-950/30"
                >
                  <p className="text-sm font-medium">{SECTION_TYPES[type].label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{SECTION_TYPES[type].description}</p>
                </button>
              ))}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("pages.settings")}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <div><Label>{t("common:ui.title_field")}</Label><Input value={meta.title} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} /></div>
            {page.slug !== "home" && (
              <div><Label>{t("pages.url_slug")}</Label><Input value={meta.slug} onChange={(e) => setMeta((m) => ({ ...m, slug: e.target.value }))} /></div>
            )}
            <div><Label>{t("pages.breadcrumb")}</Label><LocaleTextInput baseKey="breadcrumbLabel" values={meta as unknown as Record<string, unknown>} onChange={(next) => setMeta(next as unknown as typeof meta)} /></div>
            <div><Label>{t("news.seo_title")}</Label><LocaleTextInput baseKey="metaTitle" values={meta as unknown as Record<string, unknown>} onChange={(next) => setMeta(next as unknown as typeof meta)} /></div>
            <div><Label>{t("news.seo_description")}</Label><LocaleTextInput baseKey="metaDescription" values={meta as unknown as Record<string, unknown>} onChange={(next) => setMeta(next as unknown as typeof meta)} multiline /></div>
            <Button onClick={() => savePageMeta()} disabled={savingMeta} className="w-full">{savingMeta ? "Saving…" : "Save Settings"}</Button>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title={t("pages.remove_section")}
        description={t("pages.remove_section_body")}
        onConfirm={() => deleteId && deleteSection(deleteId)}
        loading={deletingSection}
        variant="destructive"
      />
    </div>
  );
}
