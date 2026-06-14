"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Globe, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";

const PLATFORMS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "x", label: "X (Twitter)" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "snapchat", label: "Snapchat" },
];

function LangTabs({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  return (
    <div className="flex gap-1 mb-2">
      {["en", "fr", "ar"].map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-3 py-1 text-xs rounded font-medium transition-colors ${lang === l ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function FooterEditorPage() {
  const qc = useQueryClient();
  const [lang, setLang] = useState("en");
  const [appearance, setAppearance] = useState({
    backgroundColor: "#0a1628", textColor: "#ffffff", accentColor: "#1da1f2",
    logoUrl: "", tagline: "", taglineFr: "", taglineAr: "",
    copyrightText: "© 2026 Football Skills Academy. All rights reserved.",
    showTrustpilot: false, trustpilotUrl: "",
  });
  const [socialLinks, setSocialLinks] = useState(
    PLATFORMS.map((p, i) => ({ platform: p.id, url: "", isActive: true, position: i }))
  );
  const [linkColumns, setLinkColumns] = useState<Array<{
    title: string; titleFr: string; titleAr: string; position: number;
    links: Array<{ label: string; labelFr: string; labelAr: string; url: string; openInNewTab: boolean; position: number; isActive: boolean }>;
  }>>([]);
  const [bottomLinks, setBottomLinks] = useState<Array<{ label: string; labelFr: string; labelAr: string; url: string; position: number }>>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["footer-config"],
    queryFn: () => fetch("/api/website/footer").then((r) => r.json()),
  });

  useEffect(() => {
    if (!data?.id) return;
    setAppearance({
      backgroundColor: data.backgroundColor ?? "#0a1628",
      textColor: data.textColor ?? "#ffffff",
      accentColor: data.accentColor ?? "#1da1f2",
      logoUrl: data.logoUrl ?? "",
      tagline: data.tagline ?? "",
      taglineFr: data.taglineFr ?? "",
      taglineAr: data.taglineAr ?? "",
      copyrightText: data.copyrightText ?? "© 2026 Football Skills Academy. All rights reserved.",
      showTrustpilot: data.showTrustpilot ?? false,
      trustpilotUrl: data.trustpilotUrl ?? "",
    });
    if (data.socialLinks?.length) {
      const merged = PLATFORMS.map((p, i) => {
        const existing = data.socialLinks.find((s: { platform: string }) => s.platform === p.id);
        return { platform: p.id, url: existing?.url ?? "", isActive: existing?.isActive ?? true, position: existing?.position ?? i };
      });
      setSocialLinks(merged);
    }
    if (data.linkColumns?.length) {
      setLinkColumns(data.linkColumns.map((col: {
        title: string; titleFr?: string; titleAr?: string; position: number;
        links: Array<{ label: string; labelFr?: string; labelAr?: string; url: string; openInNewTab?: boolean; position: number; isActive?: boolean }>;
      }) => ({
        title: col.title, titleFr: col.titleFr ?? "", titleAr: col.titleAr ?? "", position: col.position,
        links: (col.links ?? []).map((l) => ({ label: l.label, labelFr: l.labelFr ?? "", labelAr: l.labelAr ?? "", url: l.url, openInNewTab: l.openInNewTab ?? false, position: l.position, isActive: l.isActive ?? true })),
      })));
    }
    if (data.bottomLinks?.length) {
      setBottomLinks(data.bottomLinks.map((l: { label: string; labelFr?: string; labelAr?: string; url: string; position: number }) => ({ label: l.label, labelFr: l.labelFr ?? "", labelAr: l.labelAr ?? "", url: l.url, position: l.position })));
    }
  }, [data]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      fetch("/api/website/footer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appearance, socialLinks: socialLinks.filter((s) => s.url), linkColumns, bottomLinks }),
      }).then((r) => r.json()),
    onSuccess: () => { toast.success("Footer saved!"); qc.invalidateQueries({ queryKey: ["footer-config"] }); },
    onError: () => toast.error("Failed to save"),
  });

  const addColumn = useCallback(() => {
    setLinkColumns((prev) => [...prev, { title: "New Column", titleFr: "", titleAr: "", position: prev.length, links: [] }]);
  }, []);

  const removeColumn = useCallback((idx: number) => {
    setLinkColumns((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addLink = useCallback((colIdx: number) => {
    setLinkColumns((prev) => prev.map((col, i) =>
      i === colIdx ? { ...col, links: [...col.links, { label: "New Link", labelFr: "", labelAr: "", url: "/", openInNewTab: false, position: col.links.length, isActive: true }] } : col
    ));
  }, []);

  const removeLink = useCallback((colIdx: number, linkIdx: number) => {
    setLinkColumns((prev) => prev.map((col, i) =>
      i === colIdx ? { ...col, links: col.links.filter((_, j) => j !== linkIdx) } : col
    ));
  }, []);

  if (isLoading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <PageHeader title="Footer Editor" description="Customize your website footer — appearance, links, and social icons." />

      {/* Appearance */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Background Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={appearance.backgroundColor} onChange={(e) => setAppearance((p) => ({ ...p, backgroundColor: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border" />
              <Input value={appearance.backgroundColor} onChange={(e) => setAppearance((p) => ({ ...p, backgroundColor: e.target.value }))} className="font-mono text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Text Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={appearance.textColor} onChange={(e) => setAppearance((p) => ({ ...p, textColor: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border" />
              <Input value={appearance.textColor} onChange={(e) => setAppearance((p) => ({ ...p, textColor: e.target.value }))} className="font-mono text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Accent Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={appearance.accentColor} onChange={(e) => setAppearance((p) => ({ ...p, accentColor: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border" />
              <Input value={appearance.accentColor} onChange={(e) => setAppearance((p) => ({ ...p, accentColor: e.target.value }))} className="font-mono text-sm" />
            </div>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Logo URL</label>
          <Input value={appearance.logoUrl} onChange={(e) => setAppearance((p) => ({ ...p, logoUrl: e.target.value }))} placeholder="https://..." />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Tagline</label>
          <LangTabs lang={lang} setLang={setLang} />
          {lang === "en" && <Input value={appearance.tagline} onChange={(e) => setAppearance((p) => ({ ...p, tagline: e.target.value }))} placeholder="Your academy tagline..." />}
          {lang === "fr" && <Input value={appearance.taglineFr} onChange={(e) => setAppearance((p) => ({ ...p, taglineFr: e.target.value }))} placeholder="Slogan en français..." />}
          {lang === "ar" && <Input value={appearance.taglineAr} onChange={(e) => setAppearance((p) => ({ ...p, taglineAr: e.target.value }))} placeholder="الشعار بالعربية..." dir="rtl" />}
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Copyright Text</label>
          <Input value={appearance.copyrightText} onChange={(e) => setAppearance((p) => ({ ...p, copyrightText: e.target.value }))} />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={appearance.showTrustpilot} onCheckedChange={(v) => setAppearance((p) => ({ ...p, showTrustpilot: v }))} />
          <span className="text-sm">Show Trustpilot Badge</span>
          {appearance.showTrustpilot && (
            <Input value={appearance.trustpilotUrl} onChange={(e) => setAppearance((p) => ({ ...p, trustpilotUrl: e.target.value }))} placeholder="https://www.trustpilot.com/..." className="flex-1" />
          )}
        </div>
      </section>

      {/* Social Links */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
        <h2 className="text-lg font-semibold">Social Media Links</h2>
        <p className="text-sm text-gray-500">Leave blank to hide that platform's icon.</p>
        {PLATFORMS.map((platform, idx) => (
          <div key={platform.id} className="flex gap-3 items-center">
            <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">{platform.label}</div>
            <Input
              value={socialLinks[idx]?.url ?? ""}
              onChange={(e) => setSocialLinks((prev) => prev.map((s, i) => i === idx ? { ...s, url: e.target.value } : s))}
              placeholder={`https://${platform.id}.com/yourpage`}
              className="flex-1"
            />
            <Switch
              checked={socialLinks[idx]?.isActive ?? true}
              onCheckedChange={(v) => setSocialLinks((prev) => prev.map((s, i) => i === idx ? { ...s, isActive: v } : s))}
            />
          </div>
        ))}
      </section>

      {/* Link Columns */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Link Columns</h2>
          <Button size="sm" variant="outline" onClick={addColumn} disabled={linkColumns.length >= 5}>
            <Plus className="w-4 h-4 mr-1" /> Add Column
          </Button>
        </div>
        {linkColumns.map((col, colIdx) => (
          <div key={colIdx} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <LangTabs lang={lang} setLang={setLang} />
                {lang === "en" && <Input value={col.title} onChange={(e) => setLinkColumns((prev) => prev.map((c, i) => i === colIdx ? { ...c, title: e.target.value } : c))} placeholder="Column title..." />}
                {lang === "fr" && <Input value={col.titleFr} onChange={(e) => setLinkColumns((prev) => prev.map((c, i) => i === colIdx ? { ...c, titleFr: e.target.value } : c))} placeholder="Titre en français..." />}
                {lang === "ar" && <Input value={col.titleAr} onChange={(e) => setLinkColumns((prev) => prev.map((c, i) => i === colIdx ? { ...c, titleAr: e.target.value } : c))} placeholder="العنوان بالعربية..." dir="rtl" />}
              </div>
              <Button size="sm" variant="ghost" className="text-red-500 ml-3" onClick={() => removeColumn(colIdx)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 pl-2 border-l-2 border-gray-100 dark:border-gray-700">
              {col.links.map((link, linkIdx) => (
                <div key={linkIdx} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                  {lang === "en" && <Input value={link.label} onChange={(e) => setLinkColumns((prev) => prev.map((c, ci) => ci === colIdx ? { ...c, links: c.links.map((l, li) => li === linkIdx ? { ...l, label: e.target.value } : l) } : c))} placeholder="Label" />}
                  {lang === "fr" && <Input value={link.labelFr} onChange={(e) => setLinkColumns((prev) => prev.map((c, ci) => ci === colIdx ? { ...c, links: c.links.map((l, li) => li === linkIdx ? { ...l, labelFr: e.target.value } : l) } : c))} placeholder="Libellé FR" />}
                  {lang === "ar" && <Input value={link.labelAr} onChange={(e) => setLinkColumns((prev) => prev.map((c, ci) => ci === colIdx ? { ...c, links: c.links.map((l, li) => li === linkIdx ? { ...l, labelAr: e.target.value } : l) } : c))} placeholder="التسمية AR" dir="rtl" />}
                  <Input value={link.url} onChange={(e) => setLinkColumns((prev) => prev.map((c, ci) => ci === colIdx ? { ...c, links: c.links.map((l, li) => li === linkIdx ? { ...l, url: e.target.value } : l) } : c))} placeholder="/page-url" />
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-gray-400" />
                    <Switch
                      checked={link.openInNewTab}
                      onCheckedChange={(v) => setLinkColumns((prev) => prev.map((c, ci) => ci === colIdx ? { ...c, links: c.links.map((l, li) => li === linkIdx ? { ...l, openInNewTab: v } : l) } : c))}
                    />
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-400 p-1" onClick={() => removeLink(colIdx, linkIdx)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="ghost" className="text-blue-500" onClick={() => addLink(colIdx)}>
                <Plus className="w-3 h-3 mr-1" /> Add Link
              </Button>
            </div>
          </div>
        ))}
      </section>

      {/* Bottom Links */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bottom Bar Links</h2>
          <Button size="sm" variant="outline" onClick={() => setBottomLinks((prev) => [...prev, { label: "Link", labelFr: "", labelAr: "", url: "/", position: prev.length }])}>
            <Plus className="w-4 h-4 mr-1" /> Add Link
          </Button>
        </div>
        {bottomLinks.map((link, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            {lang === "en" && <Input value={link.label} onChange={(e) => setBottomLinks((prev) => prev.map((l, i) => i === idx ? { ...l, label: e.target.value } : l))} placeholder="Label" />}
            {lang === "fr" && <Input value={link.labelFr} onChange={(e) => setBottomLinks((prev) => prev.map((l, i) => i === idx ? { ...l, labelFr: e.target.value } : l))} placeholder="Libellé FR" />}
            {lang === "ar" && <Input value={link.labelAr} onChange={(e) => setBottomLinks((prev) => prev.map((l, i) => i === idx ? { ...l, labelAr: e.target.value } : l))} placeholder="AR" dir="rtl" />}
            <Input value={link.url} onChange={(e) => setBottomLinks((prev) => prev.map((l, i) => i === idx ? { ...l, url: e.target.value } : l))} placeholder="/terms" />
            <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setBottomLinks((prev) => prev.filter((_, i) => i !== idx))}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {!bottomLinks.length && <p className="text-sm text-gray-400">No bottom links added yet.</p>}
      </section>

      {/* Save */}
      <div className="flex justify-end pt-4">
        <Button onClick={() => save()} disabled={isPending} className="min-w-32">
          {isPending ? "Saving..." : "Save Footer"}
        </Button>
      </div>
    </div>
  );
}
