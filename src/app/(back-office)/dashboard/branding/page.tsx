"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, ImageIcon, Eye, Palette, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useTranslation } from "react-i18next";

interface LogoSlot {
  /** Setting key the uploaded URL is stored under. */
  key: string;
  /** Slot identity, used to build the i18n key. */
  id: string;
  /** Whether this slot has a recommended-format hint to show. */
  recommended?: boolean;
}

/**
 * Logo slots and colour fields.
 *
 * These are module-scope constants, so they cannot call `t()` where they are
 * declared — a hook has no component to run in. They therefore hold i18n *keys*
 * and are resolved at render time (see `tt()` inside the component below).
 */
const LOGO_GROUPS = [
  {
    id: "website",
    slots: [
      { key: "logo_website_light", id: "light", recommended: true },
      { key: "logo_website_dark", id: "dark", recommended: true },
      { key: "logo_website_favicon", id: "favicon", recommended: true },
    ],
  },
  {
    id: "admin",
    slots: [
      { key: "logo_admin_light", id: "light" },
      { key: "logo_admin_dark", id: "dark" },
      { key: "logo_admin_sidebar", id: "sidebar", recommended: true },
    ],
  },
  {
    id: "player",
    slots: [
      { key: "logo_player_light", id: "light" },
      { key: "logo_player_dark", id: "dark" },
      { key: "logo_player_sidebar", id: "sidebar", recommended: true },
    ],
  },
] as const;

// Defaults mirror the Obsidian Flux tokens seeded in prisma/seed.ts. They were
// still the retired red palette (#A02020 …), so "reset to default" in Branding
// would have dropped an academy back onto the pre-redesign colours.
const COLOR_FIELDS = [
  { key: "primary_color", id: "primary", default: "#0070f3" },
  { key: "secondary_color", id: "secondary", default: "#0059c5" },
  { key: "dark_bg_color", id: "dark_bg", default: "#131313" },
  { key: "card_dark_color", id: "card_dark", default: "#1c1b1b" },
] as const;

const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Poppins",
  "Montserrat",
  "Open Sans",
  "Nunito",
  "Lato",
];

function LogoCard({ slot, group, url, onUpload, onRemove }: {
  slot: LogoSlot;
  /** Group id, so the same slot id can read differently per surface. */
  group: string;
  url: string;
  onUpload: (key: string, file: File) => Promise<void>;
  onRemove: (key: string) => Promise<void>;
}) {
  const { t } = useTranslation("admin");
  const label = t(`branding.slot.${slot.id}`);
  const description = t(`branding.slot.${group}_${slot.id}_hint`);
  const recommended = slot.recommended ? t(`branding.slot.${group}_${slot.id}_rec`) : null;
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [preview, setPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onUpload(slot.key, file);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove() {
    setRemoving(true);
    await onRemove(slot.key);
    setRemoving(false);
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
      <div>
        <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{label}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{description}</p>
        {recommended && <p className="text-xs mt-0.5" style={{ color: "var(--ob-primary-light)" }}>💡 {recommended}</p>}
      </div>

      {url ? (
        <div className="space-y-2">
          <div className="relative group rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: 80, background: "var(--muted-bg)", border: "1px solid var(--card-border)" }}>
            <img src={url} alt={label} className="max-h-20 max-w-full object-contain p-2" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button onClick={() => setPreview(true)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"><Eye className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer">
              <input ref={inputRef} type="file" className="hidden" accept="image/*,.ico" onChange={handleFile} />
              <div className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer" style={{ border: "1px solid var(--card-border)", color: "var(--text-secondary)" }}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {t("branding.replace")}
              </div>
            </label>
            <button onClick={handleRemove} disabled={removing} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ border: "1px solid rgba(255,180,171,0.35)", color: "var(--ob-error)" }}>
              {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {t("branding.remove")}
            </button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input ref={inputRef} type="file" className="hidden" accept="image/*,.ico" onChange={handleFile} />
          <div className="rounded-lg p-5 text-center transition-all" style={{ border: "2px dashed var(--card-border)" }}>
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "var(--text-muted)" }} />
            ) : (
              <>
                <ImageIcon className="w-6 h-6 mx-auto mb-1.5" style={{ color: "var(--text-muted)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("branding.click_upload")}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t("branding.formats")}</p>
              </>
            )}
          </div>
        </label>
      )}

      {preview && url && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreview(false)}>
          <div className="rounded-2xl p-6 shadow-2xl max-w-sm w-full" style={{ background: "var(--card)" }} onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>{label}</p>
            <div className="rounded-xl overflow-hidden flex items-center justify-center p-4" style={{ minHeight: 120, background: "var(--muted-bg)", border: "1px solid var(--card-border)" }}>
              <img src={url} alt={label} className="max-h-32 max-w-full object-contain" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-lg bg-white border border-gray-200 flex items-center justify-center p-3" style={{ minHeight: 60 }}>
                <img src={url} alt={t("branding.light_preview")} className="max-h-12 max-w-full object-contain" />
              </div>
              <div className="rounded-lg bg-gray-950 flex items-center justify-center p-3" style={{ minHeight: 60 }}>
                <img src={url} alt={t("branding.dark_preview")} className="max-h-12 max-w-full object-contain" />
              </div>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>{t("branding.preview_hint")}</p>
            <button onClick={() => setPreview(false)} className="mt-4 w-full text-center text-sm transition-colors" style={{ color: "var(--text-muted)" }}>{t("common:ui.close")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrandingPage() {
  const { t } = useTranslation("admin");
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const [fontFamily, setFontFamily] = useState("Inter");
  const [footerCopyright, setFooterCopyright] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingColors, setSavingColors] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/branding").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([logoData, settingsData]) => {
      setLogos(logoData);
      const c: Record<string, string> = {};
      for (const f of COLOR_FIELDS) {
        c[f.key] = settingsData[f.key] ?? f.default;
      }
      setColors(c);
      setFontFamily(settingsData.font_family ?? "Inter");
      setFooterCopyright(settingsData.footer_copyright ?? "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleUpload(key: string, file: File) {
    const fd = new FormData();
    fd.append("key", key);
    fd.append("file", file);
    try {
      const r = await fetch("/api/branding", { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok) {
        setLogos((p) => ({ ...p, [key]: d.url }));
        toast.success(t("branding.logo_uploaded"));
      } else {
        toast.error(d.error ?? "Upload failed");
      }
    } catch {
      toast.error(t("common:toast.upload_failed"));
    }
  }

  async function handleRemove(key: string) {
    try {
      const r = await fetch("/api/branding", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
      if (r.ok) {
        setLogos((p) => ({ ...p, [key]: "" }));
        toast.success(t("branding.logo_removed"));
      } else {
        toast.error(t("branding.remove_failed"));
      }
    } catch {
      toast.error(t("branding.remove_failed"));
    }
  }

  async function saveColors() {
    setSavingColors(true);
    try {
      const payload: Record<string, string> = {
        ...colors,
        font_family: fontFamily,
        footer_copyright: footerCopyright,
      };
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        toast.success(t("branding.colors_saved"));
      } else {
        toast.error(t("branding.colors_failed"));
      }
    } catch {
      toast.error(t("branding.colors_failed"));
    } finally {
      setSavingColors(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Was a bare <h1> + <p>, which bypassed PageHeader and so opted out of
          the shared heading rhythm and the one-<h1>-per-page guarantee. */}
      <PageHeader title={t("branding.title")} description={t("branding.subtitle")} />

      {/* BRAND COLORS */}
      <section className="space-y-4">
        <div className="pb-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5" style={{ color: "#A02020" }} />
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>{t("branding.colors")}</h2>
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{t("branding.colors_hint")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COLOR_FIELDS.map((f) => (
            <div key={f.key} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t(`branding.color.${f.id}`)}</label>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{t(`branding.color.${f.id}_hint`)}</p>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-10 rounded-lg overflow-hidden cursor-pointer" style={{ border: "2px solid var(--card-border)" }}>
                  <input
                    type="color"
                    value={colors[f.key] ?? f.default}
                    onChange={(e) => setColors((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full h-full rounded-md" style={{ background: colors[f.key] ?? f.default }} />
                </div>
                <input
                  type="text"
                  value={colors[f.key] ?? f.default}
                  onChange={(e) => setColors((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="flex-1 text-sm font-mono rounded-lg px-3 py-2 outline-none"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                  placeholder={f.default}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Font Family */}
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
          <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("branding.font")}</label>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{t("branding.font_hint")}</p>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
          >
            {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Footer Copyright */}
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
          <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("branding.footer_text")}</label>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{t("branding.footer_hint")}</p>
          <input
            type="text"
            value={footerCopyright}
            onChange={(e) => setFooterCopyright(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            placeholder={`© ${new Date().getFullYear()} Football Skills Academy. All rights reserved.`}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveColors}
            disabled={savingColors}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: "#A02020" }}
            onMouseEnter={e => !savingColors && (e.currentTarget.style.background = "#903030")}
            onMouseLeave={e => (e.currentTarget.style.background = "#A02020")}
          >
            {savingColors ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Brand Settings
          </button>
        </div>
      </section>

      {/* LOGOS */}
      {LOGO_GROUPS.map((group) => (
        <section key={group.id} className="space-y-4">
          <div className="pb-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>{t(`branding.group.${group.id}`)}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t(`branding.group.${group.id}_hint`)}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.slots.map((slot) => (
              <LogoCard
                key={slot.key}
                slot={slot}
                group={group.id}
                url={logos[slot.key] ?? ""}
                onUpload={handleUpload}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
