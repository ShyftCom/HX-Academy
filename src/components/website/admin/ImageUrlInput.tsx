"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Shared, single implementation of "paste a URL or upload a file" for
 *  image fields across the Showcase Website admin — the pre-existing
 *  ImageUploader/LogoUploader components on slides/sponsors/branding pages
 *  are near-duplicates of each other; new admin UI should use this instead. */
export function ImageUrlInput({ value, onChange, label }: { value: string; onChange: (url: string) => void; label?: string }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "website");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) onChange(data.url);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>}
      <div className="flex items-center gap-2">
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" className="flex-1" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          aria-label="Upload image"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        {value && (
          <button type="button" onClick={() => onChange("")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800" aria-label="Clear image">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- admin-only content preview, arbitrary user-pasted URLs
        <img src={value} alt="" className="h-16 w-28 rounded-lg border border-gray-200 object-cover dark:border-gray-700" />
      )}
    </div>
  );
}
