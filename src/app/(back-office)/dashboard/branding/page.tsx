"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, ImageIcon, Eye, Palette, Save } from "lucide-react";

interface LogoSlot {
  key: string;
  label: string;
  description: string;
  recommended?: string;
}

const LOGO_GROUPS = [
  {
    title: "Website (Public)",
    description: "Logos shown on your public-facing website",
    slots: [
      { key: "logo_website_light", label: "Light Mode Logo", description: "Shown on light backgrounds", recommended: "PNG with dark text, transparent bg" },
      { key: "logo_website_dark",  label: "Dark Mode Logo",  description: "Shown on dark backgrounds", recommended: "PNG with white text, transparent bg" },
      { key: "logo_website_favicon", label: "Favicon", description: "Browser tab icon (32×32 or 64×64)", recommended: "ICO or PNG, square, min 32×32" },
    ],
  },
  {
    title: "Admin Dashboard",
    description: "Logos used in the admin back-office",
    slots: [
      { key: "logo_admin_light",   label: "Light Mode Logo",   description: "Shown when theme is light" },
      { key: "logo_admin_dark",    label: "Dark Mode Logo",    description: "Shown when theme is dark" },
      { key: "logo_admin_sidebar", label: "Sidebar Icon",      description: "Small square icon for collapsed sidebar", recommended: "Square PNG, 40×40" },
    ],
  },
  {
    title: "Player Portal",
    description: "Logos used in the player-facing portal",
    slots: [
      { key: "logo_player_light",   label: "Light Mode Logo",   description: "Shown when theme is light" },
      { key: "logo_player_dark",    label: "Dark Mode Logo",    description: "Shown when theme is dark" },
      { key: "logo_player_sidebar", label: "Sidebar Icon",      description: "Small square icon in player nav", recommended: "Square PNG, 40×40" },
    ],
  },
];

const COLOR_FIELDS = [
  { key: "primary_color",   label: "Primary Color",           description: "Main action color — buttons, links, accents",    default: "#A02020" },
  { key: "secondary_color", label: "Secondary Color",         description: "Hover / pressed state of primary",               default: "#903030" },
  { key: "dark_bg_color",   label: "Dark Mode Background",    description: "Root background in dark mode",                   default: "#101010" },
  { key: "card_dark_color", label: "Dark Mode Card Surface",  description: "Card and panel background in dark mode",         default: "#202020" },
];

const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Poppins",
  "Montserrat",
  "Open Sans",
  "Nunito",
  "Lato",
];

function LogoCard({ slot, url, onUpload, onRemove }: {
  slot: LogoSlot;
  url: string;
  onUpload: (key: string, file: File) => Promise<void>;
  onRemove: (key: string) => Promise<void>;
}) {
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
        <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{slot.label}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{slot.description}</p>
        {slot.recommended && <p className="text-xs mt-0.5" style={{ color: "#A02020" }}>💡 {slot.recommended}</p>}
      </div>

      {url ? (
        <div className="space-y-2">
          <div className="relative group rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: 80, background: "var(--muted-bg)", border: "1px solid var(--card-border)" }}>
            <img src={url} alt={slot.label} className="max-h-20 max-w-full object-contain p-2" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button onClick={() => setPreview(true)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"><Eye className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer">
              <input ref={inputRef} type="file" className="hidden" accept="image/*,.ico" onChange={handleFile} />
              <div className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer" style={{ border: "1px solid var(--card-border)", color: "var(--text-secondary)" }}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Replace
              </div>
            </label>
            <button onClick={handleRemove} disabled={removing} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ border: "1px solid #FEE2E2", color: "#A02020" }}>
              {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Remove
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
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Click to upload</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>PNG, SVG, ICO, JPG</p>
              </>
            )}
          </div>
        </label>
      )}

      {preview && url && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreview(false)}>
          <div className="rounded-2xl p-6 shadow-2xl max-w-sm w-full" style={{ background: "var(--card)" }} onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>{slot.label} — Preview</p>
            <div className="rounded-xl overflow-hidden flex items-center justify-center p-4" style={{ minHeight: 120, background: "var(--muted-bg)", border: "1px solid var(--card-border)" }}>
              <img src={url} alt={slot.label} className="max-h-32 max-w-full object-contain" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-lg bg-white border border-gray-200 flex items-center justify-center p-3" style={{ minHeight: 60 }}>
                <img src={url} alt="light preview" className="max-h-12 max-w-full object-contain" />
              </div>
              <div className="rounded-lg bg-gray-950 flex items-center justify-center p-3" style={{ minHeight: 60 }}>
                <img src={url} alt="dark preview" className="max-h-12 max-w-full object-contain" />
              </div>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>Light bg / Dark bg preview</p>
            <button onClick={() => setPreview(false)} className="mt-4 w-full text-center text-sm transition-colors" style={{ color: "var(--text-muted)" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrandingPage() {
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
        toast.success("Logo uploaded");
      } else {
        toast.error(d.error ?? "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    }
  }

  async function handleRemove(key: string) {
    try {
      const r = await fetch("/api/branding", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
      if (r.ok) {
        setLogos((p) => ({ ...p, [key]: "" }));
        toast.success("Logo removed");
      } else {
        toast.error("Remove failed");
      }
    } catch {
      toast.error("Remove failed");
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
        toast.success("Brand colors saved — reload to see changes");
      } else {
        toast.error("Failed to save colors");
      }
    } catch {
      toast.error("Failed to save colors");
    } finally {
      setSavingColors(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Branding &amp; Logos</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Manage your academy's visual identity — logos, colors, typography, and footer text.</p>
      </div>

      {/* BRAND COLORS */}
      <section className="space-y-4">
        <div className="pb-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5" style={{ color: "#A02020" }} />
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Brand Colors</h2>
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>These colors inject as CSS variables globally — every button, badge, and accent updates automatically.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COLOR_FIELDS.map((f) => (
            <div key={f.key} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{f.label}</label>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{f.description}</p>
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
          <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Font Family</label>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Applied as the global UI typeface</p>
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
          <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Footer Copyright Text</label>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Shown in the website footer. Leave blank to use auto-generated text.</p>
          <input
            type="text"
            value={footerCopyright}
            onChange={(e) => setFooterCopyright(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            placeholder={`© ${new Date().getFullYear()} Foot-Ball Skills Academy. All rights reserved.`}
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
        <section key={group.title} className="space-y-4">
          <div className="pb-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>{group.title}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{group.description}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.slots.map((slot) => (
              <LogoCard
                key={slot.key}
                slot={slot}
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
