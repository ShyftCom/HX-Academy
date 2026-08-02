"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Upload, X, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { useTranslation } from "react-i18next";

export default function SummerCampPageSettingsPage() {
  const { t } = useTranslation("website");
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
    } catch { toast.error(t("common:toast.upload_failed")); }
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
      if (res.ok) toast.success(t("sc.settings_saved"));
      else toast.error(t("common:toast.save_failed_alt"));
    } catch { toast.error(t("common:toast.save_failed_alt")); }
    setSaving(false);
  }

  if (loading) return <div className="text-center py-20 text-gray-400">{t("common:ui.loading")}</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title={t("sc.title")} description={t("sc.subtitle")}>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save Changes"}
        </Button>
      </PageHeader>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Sun className="w-4 h-4 text-orange-500" /> {t("sc.content")}</h2>

        <div>
          <Label>{t("sc.page_title")}</Label>
          <Input className="mt-1" value={settings.sc_page_title} onChange={(e) => setSettings((p) => ({ ...p, sc_page_title: e.target.value }))} placeholder={t("filereq.summer_camp")} />
          <p className="text-xs text-gray-400 mt-1">{t("sc.page_title_hint")}</p>
        </div>

        <div>
          <Label>{t("sc.cta_label")}</Label>
          <Input className="mt-1" value={settings.sc_page_cta_label} onChange={(e) => setSettings((p) => ({ ...p, sc_page_cta_label: e.target.value }))} placeholder={t("sc.register")} />
        </div>

        <div>
          <Label>{t("sc.description")}</Label>
          <Textarea className="mt-1" rows={3} value={settings.sc_page_description} onChange={(e) => setSettings((p) => ({ ...p, sc_page_description: e.target.value }))} placeholder={t("sc.description_ph")} />
        </div>

        <div>
          <Label>{t("sc.hero_image")}</Label>
          <div className="mt-2 space-y-3">
            {settings.sc_page_hero_image ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.sc_page_hero_image} alt={t("sc.hero")} className="w-full h-40 object-cover" />
                <button onClick={() => setSettings((p) => ({ ...p, sc_page_hero_image: "" }))} className="absolute top-2 right-2 bg-white/80 dark:bg-gray-800/80 text-gray-600 hover:text-red-500 rounded-full p-1 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl h-36 flex flex-col items-center justify-center text-gray-400">
                <Sun className="w-8 h-8 mb-2" />
                <p className="text-sm">{t("sc.no_image")}</p>
                <p className="text-xs">{t("sc.no_image_hint")}</p>
              </div>
            )}
            <label className="inline-flex items-center gap-2 cursor-pointer border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {uploading ? <><div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />{t("sc.uploading")}</> : <><Upload className="w-4 h-4" />{t("sc.upload")}</>}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-sm text-orange-700 dark:text-orange-300">
        <strong>{t("sc.tip")}</strong> {t("sc.tip_body")} <code className="font-mono text-xs bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded">/summer-camp</code>{t("sc.tip_tail")}
      </div>
    </div>
  );
}
