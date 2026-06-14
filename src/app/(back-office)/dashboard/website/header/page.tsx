"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";

type DropdownItem = { label: string; labelFr: string; labelAr: string; url: string; icon: string; description: string; descriptionFr: string; descriptionAr: string; position: number; isActive: boolean };
type NavItem = { label: string; labelFr: string; labelAr: string; url: string; hasDropdown: boolean; position: number; isActive: boolean; dropdownItems: DropdownItem[] };

function LangTabs({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  return (
    <div className="flex gap-1 mb-2">
      {["en", "fr", "ar"].map((l) => (
        <button key={l} onClick={() => setLang(l)}
          className={`px-3 py-1 text-xs rounded font-medium transition-colors ${lang === l ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

const blankDropdownItem = (): DropdownItem => ({ label: "", labelFr: "", labelAr: "", url: "/", icon: "", description: "", descriptionFr: "", descriptionAr: "", position: 0, isActive: true });
const blankNavItem = (): NavItem => ({ label: "", labelFr: "", labelAr: "", url: "/", hasDropdown: false, position: 0, isActive: true, dropdownItems: [] });

export default function HeaderEditorPage() {
  const qc = useQueryClient();
  const [lang, setLang] = useState("en");
  const [expandedNavItem, setExpandedNavItem] = useState<number | null>(null);
  const [branding, setBranding] = useState({
    logoUrl: "", backgroundColor: "#ffffff", textColor: "#0a1628", accentColor: "#0a1628", sticky: true,
  });
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [cta, setCta] = useState({ label: "Join now", labelFr: "Rejoindre", labelAr: "انضم الآن", url: "/register", style: "filled" });
  const [options, setOptions] = useState({ showLanguageSwitcher: true });

  const { data, isLoading } = useQuery({
    queryKey: ["header-config"],
    queryFn: () => fetch("/api/website/header").then((r) => r.json()),
  });

  useEffect(() => {
    if (!data?.id) return;
    setBranding({
      logoUrl: data.logoUrl ?? "", backgroundColor: data.backgroundColor ?? "#ffffff",
      textColor: data.textColor ?? "#0a1628", accentColor: data.accentColor ?? "#0a1628",
      sticky: data.sticky ?? true,
    });
    setCta({ label: data.ctaLabel ?? "Join now", labelFr: data.ctaLabelFr ?? "Rejoindre", labelAr: data.ctaLabelAr ?? "انضم الآن", url: data.ctaUrl ?? "/register", style: data.ctaStyle ?? "filled" });
    setOptions({ showLanguageSwitcher: data.showLanguageSwitcher ?? true });
    if (data.navItems?.length) {
      setNavItems(data.navItems.map((item: NavItem & { dropdownItems?: DropdownItem[] }) => ({
        label: item.label, labelFr: item.labelFr ?? "", labelAr: item.labelAr ?? "",
        url: item.url ?? "", hasDropdown: item.hasDropdown, position: item.position, isActive: item.isActive,
        dropdownItems: (item.dropdownItems ?? []).map((d: DropdownItem) => ({ ...d, labelFr: d.labelFr ?? "", labelAr: d.labelAr ?? "", descriptionFr: d.descriptionFr ?? "", descriptionAr: d.descriptionAr ?? "", icon: d.icon ?? "" })),
      })));
    }
  }, [data]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      fetch("/api/website/header", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branding, navItems, cta, options }),
      }).then((r) => r.json()),
    onSuccess: () => { toast.success("Header saved!"); qc.invalidateQueries({ queryKey: ["header-config"] }); },
    onError: () => toast.error("Failed to save"),
  });

  const updateNavItem = useCallback((idx: number, patch: Partial<NavItem>) => {
    setNavItems((prev) => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
  }, []);

  const updateDropdownItem = useCallback((navIdx: number, dIdx: number, patch: Partial<DropdownItem>) => {
    setNavItems((prev) => prev.map((item, i) => i !== navIdx ? item : {
      ...item,
      dropdownItems: item.dropdownItems.map((d, j) => j === dIdx ? { ...d, ...patch } : d),
    }));
  }, []);

  if (isLoading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <PageHeader title="Header Editor" description="Customize your website navigation header." />

      {/* Branding */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Branding</h2>
        <div>
          <label className="text-sm font-medium block mb-1">Logo URL</label>
          <Input value={branding.logoUrl} onChange={(e) => setBranding((p) => ({ ...p, logoUrl: e.target.value }))} placeholder="https://..." />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: "backgroundColor", label: "Background Color" },
            { key: "textColor", label: "Text / Link Color" },
            { key: "accentColor", label: "Accent / CTA Color" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm font-medium block mb-1">{label}</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={branding[key as keyof typeof branding] as string}
                  onChange={(e) => setBranding((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border" />
                <Input value={branding[key as keyof typeof branding] as string}
                  onChange={(e) => setBranding((p) => ({ ...p, [key]: e.target.value }))}
                  className="font-mono text-sm" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={branding.sticky} onCheckedChange={(v) => setBranding((p) => ({ ...p, sticky: v }))} />
          <span className="text-sm">Sticky Header</span>
        </div>
      </section>

      {/* Navigation Items */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Navigation Items</h2>
          <div className="flex items-center gap-2">
            <LangTabs lang={lang} setLang={setLang} />
            <Button size="sm" variant="outline" onClick={() => setNavItems((p) => [...p, blankNavItem()])}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          </div>
        </div>
        {navItems.map((item, idx) => (
          <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50">
              <button onClick={() => setExpandedNavItem(expandedNavItem === idx ? null : idx)} className="text-gray-500 hover:text-gray-700">
                {expandedNavItem === idx ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {lang === "en" && <Input value={item.label} onChange={(e) => updateNavItem(idx, { label: e.target.value })} placeholder="Label" className="flex-1 h-8 text-sm" />}
              {lang === "fr" && <Input value={item.labelFr} onChange={(e) => updateNavItem(idx, { labelFr: e.target.value })} placeholder="Libellé" className="flex-1 h-8 text-sm" />}
              {lang === "ar" && <Input value={item.labelAr} onChange={(e) => updateNavItem(idx, { labelAr: e.target.value })} placeholder="التسمية" className="flex-1 h-8 text-sm" dir="rtl" />}
              <Input value={item.url ?? ""} onChange={(e) => updateNavItem(idx, { url: e.target.value })} placeholder="/url" className="w-36 h-8 text-sm" />
              <div className="flex items-center gap-1">
                <Switch checked={item.isActive} onCheckedChange={(v) => updateNavItem(idx, { isActive: v })} />
                <span className="text-xs text-gray-500">Active</span>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={item.hasDropdown} onCheckedChange={(v) => updateNavItem(idx, { hasDropdown: v })} />
                <span className="text-xs text-gray-500">Dropdown</span>
              </div>
              <Button size="sm" variant="ghost" className="text-red-400 p-1" onClick={() => setNavItems((p) => p.filter((_, i) => i !== idx))}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            {expandedNavItem === idx && item.hasDropdown && (
              <div className="p-4 space-y-2 border-t border-gray-100 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dropdown Items</p>
                {item.dropdownItems.map((d, dIdx) => (
                  <div key={dIdx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center border border-gray-100 dark:border-gray-600 rounded p-2">
                    {lang === "en" && <Input value={d.label} onChange={(e) => updateDropdownItem(idx, dIdx, { label: e.target.value })} placeholder="Label" className="h-8 text-sm" />}
                    {lang === "fr" && <Input value={d.labelFr} onChange={(e) => updateDropdownItem(idx, dIdx, { labelFr: e.target.value })} placeholder="Libellé" className="h-8 text-sm" />}
                    {lang === "ar" && <Input value={d.labelAr} onChange={(e) => updateDropdownItem(idx, dIdx, { labelAr: e.target.value })} placeholder="التسمية" className="h-8 text-sm" dir="rtl" />}
                    <Input value={d.url} onChange={(e) => updateDropdownItem(idx, dIdx, { url: e.target.value })} placeholder="/url" className="h-8 text-sm" />
                    <Input value={d.icon} onChange={(e) => updateDropdownItem(idx, dIdx, { icon: e.target.value })} placeholder="ti-icon-name" className="h-8 text-sm" />
                    <Button size="sm" variant="ghost" className="text-red-400 p-1" onClick={() => updateNavItem(idx, { dropdownItems: item.dropdownItems.filter((_, j) => j !== dIdx) })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    {lang === "en" && <Input value={d.description} onChange={(e) => updateDropdownItem(idx, dIdx, { description: e.target.value })} placeholder="Description (optional)" className="col-span-4 h-8 text-sm" />}
                    {lang === "fr" && <Input value={d.descriptionFr} onChange={(e) => updateDropdownItem(idx, dIdx, { descriptionFr: e.target.value })} placeholder="Description FR" className="col-span-4 h-8 text-sm" />}
                    {lang === "ar" && <Input value={d.descriptionAr} onChange={(e) => updateDropdownItem(idx, dIdx, { descriptionAr: e.target.value })} placeholder="الوصف" className="col-span-4 h-8 text-sm" dir="rtl" />}
                  </div>
                ))}
                <Button size="sm" variant="ghost" className="text-blue-500 text-xs" onClick={() => updateNavItem(idx, { dropdownItems: [...item.dropdownItems, blankDropdownItem()] })}>
                  <Plus className="w-3 h-3 mr-1" /> Add Dropdown Item
                </Button>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* CTA Button */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold">CTA Button</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Label</label>
            <LangTabs lang={lang} setLang={setLang} />
            {lang === "en" && <Input value={cta.label} onChange={(e) => setCta((p) => ({ ...p, label: e.target.value }))} placeholder="Join now" />}
            {lang === "fr" && <Input value={cta.labelFr} onChange={(e) => setCta((p) => ({ ...p, labelFr: e.target.value }))} placeholder="Rejoindre" />}
            {lang === "ar" && <Input value={cta.labelAr} onChange={(e) => setCta((p) => ({ ...p, labelAr: e.target.value }))} placeholder="انضم الآن" dir="rtl" />}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">URL</label>
            <Input value={cta.url} onChange={(e) => setCta((p) => ({ ...p, url: e.target.value }))} placeholder="/register" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Style</label>
          <Select value={cta.style} onValueChange={(v) => setCta((p) => ({ ...p, style: v }))}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="filled">Filled</SelectItem>
              <SelectItem value="outlined">Outlined</SelectItem>
              <SelectItem value="text">Text Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Options */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
        <h2 className="text-lg font-semibold">Options</h2>
        <div className="flex items-center gap-3">
          <Switch checked={options.showLanguageSwitcher} onCheckedChange={(v) => setOptions((p) => ({ ...p, showLanguageSwitcher: v }))} />
          <span className="text-sm">Show Language Switcher</span>
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <Button onClick={() => save()} disabled={isPending} className="min-w-32">
          {isPending ? "Saving..." : "Save Header"}
        </Button>
      </div>
    </div>
  );
}
