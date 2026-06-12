"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, ImageIcon, Eye } from "lucide-react";

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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div>
        <p className="font-medium text-gray-900 dark:text-white text-sm">{slot.label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{slot.description}</p>
        {slot.recommended && <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">💡 {slot.recommended}</p>}
      </div>

      {url ? (
        <div className="space-y-2">
          <div className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center" style={{ minHeight: 80 }}>
            <img src={url} alt={slot.label} className="max-h-20 max-w-full object-contain p-2" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button onClick={() => setPreview(true)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"><Eye className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer">
              <input ref={inputRef} type="file" className="hidden" accept="image/*,.ico" onChange={handleFile} />
              <div className="flex items-center justify-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Replace
              </div>
            </label>
            <button onClick={handleRemove} disabled={removing} className="flex items-center gap-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
              {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input ref={inputRef} type="file" className="hidden" accept="image/*,.ico" onChange={handleFile} />
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-5 text-center hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50/30 dark:hover:bg-green-900/10 transition-all">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            ) : (
              <>
                <ImageIcon className="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-1.5" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Click to upload</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">PNG, SVG, ICO, JPG</p>
              </>
            )}
          </div>
        </label>
      )}

      {preview && url && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreview(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-gray-900 dark:text-white mb-4">{slot.label} — Preview</p>
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex items-center justify-center p-4" style={{ minHeight: 120 }}>
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
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">Light bg / Dark bg preview</p>
            <button onClick={() => setPreview(false)} className="mt-4 w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrandingPage() {
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => r.json())
      .then((d) => { setLogos(d); setLoading(false); })
      .catch(() => setLoading(false));
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branding &amp; Logos</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Upload logos for each part of the platform. The correct logo displays automatically based on the interface and theme.</p>
      </div>

      {LOGO_GROUPS.map((group) => (
        <div key={group.title} className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">{group.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{group.description}</p>
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
        </div>
      ))}
    </div>
  );
}
