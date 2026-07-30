"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const LOCALES = [
  { code: "base", tab: "EN" },
  { code: "Fr", tab: "FR" },
  { code: "Ar", tab: "AR" },
] as const;

/** Shared field/fieldFr/fieldAr editor — the multi-locale pattern used
 *  throughout the schema (HeaderNavItem.label/labelFr/labelAr etc). Existing
 *  admin pages (header, footer) each hand-roll their own copy of this exact
 *  tab UI; this is the one reusable version for new Showcase Website forms. */
export function LocaleTextInput({
  baseKey,
  values,
  onChange,
  label,
  multiline,
}: {
  baseKey: string;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  label?: string;
  multiline?: boolean;
}) {
  const [tab, setTab] = useState<(typeof LOCALES)[number]["code"]>("base");
  const Field = multiline ? Textarea : Input;

  function keyFor(code: (typeof LOCALES)[number]["code"]) {
    return code === "base" ? baseKey : `${baseKey}${code}`;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        {label && <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>}
        <div className="flex gap-0.5 rounded-md bg-gray-100 p-0.5 dark:bg-gray-800">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setTab(l.code)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-semibold transition-colors",
                tab === l.code ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              )}
            >
              {l.tab}
            </button>
          ))}
        </div>
      </div>
      <Field
        value={(values[keyFor(tab)] as string) ?? ""}
        onChange={(e) => onChange({ ...values, [keyFor(tab)]: e.target.value })}
        placeholder={tab !== "base" ? "Falls back to EN if left blank" : undefined}
      />
    </div>
  );
}
