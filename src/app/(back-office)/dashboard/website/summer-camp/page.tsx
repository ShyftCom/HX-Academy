"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Upload, X, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";

export default function SummerCampPageSettingsPage() {
  const [settings, setSettings] = useState({
    sc_page_title: "Summer Camp",
    sc_page_hero_image: "",
    sc_page_description: "Join our summer camp program and develop your football skills in a fun, safe environment.",
    sc_page_cta_label: "Register Now",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/website/sc-settings")
      .then((r) => r.json())
      .then((d) => { setSettings((p) => ({ ...p, ...d })); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "summer-camp-hero");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) setSettings((p) => ({ ...p, sc_page_hero_image: d.url }));
      else toast.error(d.error ?? "Upload failed");
    } catch { toast.error("Upload failed"); }
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/website/sc-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) toast.success("Settings saved");
      else toast.error("Failed to save");
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Summer Camp Page" description="Configure the public Summer Camp landing page content.">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save Changes"}
        </Button>
      </PageHeader>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Sun className="w-4 h-4 text-orange-500" /> Page Content</h2>

        <div>
          <Label>Page Title</Label>
          <Input className="mt-1" value={settings.sc_page_title} onChange={(e) => setSettings((p) => ({ ...p, sc_page_title: e.target.value }))} placeholder="Summer Camp" />
          <p className="text-xs text-gray-400 mt-1">This title shows in the hero section and as the header link label.</p>
        </div>

        <div>
          <Label>CTA Button Label</Label>
          <Input className="mt-1" value={settings.sc_page_cta_label} onChange={(e) => setSettings((p) => ({ ...p, sc_page_cta_label: e.target.value }))} placeholder="Register Now" />
        </div>

        <div>
          <Label>Description / Subtitle</Label>
          <Textarea className="mt-1" rows={3} value={settings.sc_page_description} onChange={(e) => setSettings((p) => ({ ...p, sc_page_description: e.target.value }))} placeholder="Brief description shown in the hero..." />
        </div>

        <div>
          <Label>Hero / Cover Image</Label>
          <div className="mt-2 space-y-3">
            {settings.sc_page_hero_image ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.sc_page_hero_image} alt="Hero" className="w-full h-40 object-cover" />
                <button onClick={() => setSettings((p) => ({ ...p, sc_page_hero_image: "" }))} className="absolute top-2 right-2 bg-white/80 dark:bg-gray-800/80 text-gray-600 hover:text-red-500 rounded-full p-1 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl h-36 flex flex-col items-center justify-center text-gray-400">
                <Sun className="w-8 h-8 mb-2" />
                <p className="text-sm">No image uploaded</p>
                <p className="text-xs">If empty, a gradient background will be used</p>
              </div>
            )}
            <label className="inline-flex items-center gap-2 cursor-pointer border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {uploading ? <><div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />Upload Image</>}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-sm text-orange-700 dark:text-orange-300">
        <strong>Tip:</strong> The Summer Camp landing page is at <code className="font-mono text-xs bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded">/summer-camp</code>. Manage plans at Summer Camp → Plans and sessions at Summer Camp → Sessions.
      </div>
    </div>
  );
}
