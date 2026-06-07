"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Globe, Plus, Edit, Trash2, Eye, ChevronUp, ChevronDown, Save } from "lucide-react";
import { parseJsonSafe } from "@/lib/utils";
import Link from "next/link";

const SECTION_TYPES = [
  { value: "hero", label: "Hero Section" },
  { value: "about", label: "About Section" },
  { value: "features", label: "Features" },
  { value: "plans", label: "Pricing Plans" },
  { value: "vsl", label: "Video Section (VSL)" },
  { value: "testimonials", label: "Testimonials" },
  { value: "faq", label: "FAQ" },
  { value: "registration", label: "Registration Form" },
  { value: "footer", label: "Footer" },
];

export default function LandingPageBuilderPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editSection, setEditSection] = useState<any>(null);
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [newType, setNewType] = useState("hero");
  const [sectionContent, setSectionContent] = useState<Record<string, any>>({});

  const { data: page, isLoading } = useQuery({
    queryKey: ["landing-page"],
    queryFn: () => fetch("/api/landing-page").then((r) => r.json()),
  });

  useEffect(() => {
    if (editSection) setSectionContent(parseJsonSafe(editSection.content, {}));
    else setSectionContent({});
  }, [editSection]);

  const publishMutation = useMutation({
    mutationFn: (isPublished: boolean) => fetch("/api/landing-page", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished }) }).then((r) => r.json()),
    onSuccess: (d) => { toast.success(d.isPublished ? "Landing page published!" : "Landing page unpublished"); qc.invalidateQueries({ queryKey: ["landing-page"] }); },
    onError: () => toast.error("Failed"),
  });

  const addSectionMutation = useMutation({
    mutationFn: () => fetch("/api/landing-page/sections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: newType, isEnabled: true, content: {} }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Section added"); qc.invalidateQueries({ queryKey: ["landing-page"] }); setAddOpen(false); },
    onError: () => toast.error("Add failed"),
  });

  const updateSectionMutation = useMutation({
    mutationFn: (s: any) => fetch(`/api/landing-page/sections/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: s.title, content: sectionContent, isEnabled: s.isEnabled, order: s.order }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Section updated"); qc.invalidateQueries({ queryKey: ["landing-page"] }); setEditSection(null); },
    onError: () => toast.error("Update failed"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      fetch(`/api/landing-page/sections/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isEnabled }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["landing-page"] }),
    onError: () => toast.error("Toggle failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/landing-page/sections/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Section deleted"); qc.invalidateQueries({ queryKey: ["landing-page"] }); setDeleteSectionId(null); },
    onError: () => toast.error("Delete failed"),
  });

  const sections = page?.sections ?? [];

  const getContentFields = (type: string) => {
    const baseFields: Record<string, string[]> = {
      hero: ["heading", "subheading", "buttonText", "buttonUrl", "backgroundImage"],
      about: ["title", "text", "image"],
      features: ["title", "subtitle"],
      plans: ["title", "subtitle"],
      vsl: ["title", "videoUrl", "youtubeUrl", "vimeoUrl"],
      testimonials: ["title"],
      faq: ["title"],
      registration: ["title", "subtitle"],
      footer: ["copyright", "address", "email", "phone"],
    };
    return baseFields[type] ?? ["title", "content"];
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Landing Page Builder" description="Build and publish your academy website">
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/"><Eye className="mr-2 h-4 w-4" />Preview</Link></Button>
          <Button variant={page?.isPublished ? "outline" : "default"} onClick={() => publishMutation.mutate(!page?.isPublished)} loading={publishMutation.isPending}>
            <Globe className="mr-2 h-4 w-4" />
            {page?.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Section</Button>
        </div>
      </PageHeader>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Status:</span>
        <Badge variant={page?.isPublished ? "success" : "secondary"}>{page?.isPublished ? "Published" : "Draft"}</Badge>
        <span className="text-gray-400">·</span>
        <span className="text-gray-500">{sections.length} section(s)</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>
      ) : sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 dark:border-gray-700">
          <Globe className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No sections yet — start building your page</p>
          <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Add First Section</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section: any, idx: number) => (
            <Card key={section.id} className={!section.isEnabled ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon-sm" disabled={idx === 0}><ChevronUp className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm" disabled={idx === sections.length - 1}><ChevronDown className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{section.type}</Badge>
                    {section.title && <p className="text-sm font-medium">{section.title}</p>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{Object.keys(parseJsonSafe(section.content, {})).length} field(s) configured</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={section.isEnabled} onCheckedChange={(v) => toggleMutation.mutate({ id: section.id, isEnabled: v })} />
                  <Button variant="outline" size="sm" onClick={() => setEditSection(section)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => setDeleteSectionId(section.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Section Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Add Section</DialogTitle></DialogHeader>
          <DialogBody>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Section Type</label>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SECTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addSectionMutation.mutate()} loading={addSectionMutation.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={!!editSection} onOpenChange={(o) => !o && setEditSection(null)}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>Edit — {editSection?.type} section</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3 max-h-[60vh] overflow-y-auto">
            {editSection && getContentFields(editSection.type).map((field) => (
              <div key={field}>
                {field === "content" || field === "text" || field === "subtitle" || field === "subheading" || field === "copyright" ? (
                  <Textarea label={field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} value={sectionContent[field] ?? ""} onChange={(e) => setSectionContent({ ...sectionContent, [field]: e.target.value })} rows={3} />
                ) : (
                  <Input label={field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} value={sectionContent[field] ?? ""} onChange={(e) => setSectionContent({ ...sectionContent, [field]: e.target.value })} placeholder={field.includes("Url") || field.includes("Image") ? "https://..." : ""} />
                )}
              </div>
            ))}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSection(null)}>Cancel</Button>
            <Button onClick={() => updateSectionMutation.mutate(editSection)} loading={updateSectionMutation.isPending}><Save className="mr-2 h-4 w-4" />Save Section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteSectionId} onOpenChange={(o) => !o && setDeleteSectionId(null)} title="Delete Section" description="This section will be removed from your landing page." confirmLabel="Delete" onConfirm={() => deleteSectionId && deleteMutation.mutate(deleteSectionId)} loading={deleteMutation.isPending} />
    </div>
  );
}
