"use client";

import { useState } from "react";
import type { UseFormRegister, FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Tabs for the field / fieldFr / fieldAr convention used throughout the schema
 * (HeaderNavItem.label/labelFr/labelAr, Programme.name/nameFr/nameAr, …).
 *
 * French comes first and is the default tab: the public site is French and
 * Arabic, French is the default locale, and it is what an editor is normally
 * writing. The base column is last because it is now a fallback rather than
 * the thing being authored — it holds the original English on older rows, and
 * it is what non-localised consumers still read (admin lists, order records,
 * exports), so it stays editable.
 */
const LOCALES = [
  { code: "Fr", tab: "FR" },
  { code: "Ar", tab: "AR" },
  { code: "base", tab: "Base" },
] as const;

type LocaleCode = (typeof LOCALES)[number]["code"];

function keyFor(baseKey: string, code: LocaleCode) {
  return code === "base" ? baseKey : `${baseKey}${code}`;
}

function TabStrip({
  active,
  onSelect,
  idPrefix,
}: {
  active: LocaleCode;
  onSelect: (code: LocaleCode) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex gap-0.5 rounded-md bg-gray-100 p-0.5 dark:bg-gray-800" role="tablist">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          id={`${idPrefix}-${l.code}`}
          type="button"
          role="tab"
          aria-selected={active === l.code}
          onClick={() => onSelect(l.code)}
          className={cn(
            "rounded px-2 py-0.5 text-[11px] font-semibold transition-colors",
            active === l.code
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          {l.tab}
        </button>
      ))}
    </div>
  );
}

/** Hint shown on the two locale tabs. The base value is the last fallback. */
const FALLBACK_HINT = "Laissé vide, reprend la valeur de base";

/**
 * Controlled variant — for forms that keep their state in a plain object
 * (the Showcase Website section editor, header/footer config).
 */
export function LocaleTextInput({
  baseKey,
  values,
  onChange,
  onCommit,
  label,
  multiline,
  className,
}: {
  baseKey: string;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** Called on blur with just the edited key. For editors that keep typing
   *  local and persist once the field is left (the schedule grid). */
  onCommit?: (patch: Record<string, unknown>) => void;
  label?: string;
  multiline?: boolean;
  className?: string;
}) {
  const [tab, setTab] = useState<LocaleCode>("Fr");
  const Field = multiline ? Textarea : Input;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        {label && <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>}
        <TabStrip active={tab} onSelect={setTab} idPrefix={`lti-${baseKey}`} />
      </div>
      <Field
        value={(values[keyFor(baseKey, tab)] as string) ?? ""}
        onChange={(e) => onChange({ ...values, [keyFor(baseKey, tab)]: e.target.value })}
        onBlur={onCommit ? (e) => onCommit({ [keyFor(baseKey, tab)]: e.target.value }) : undefined}
        placeholder={tab === "base" ? undefined : FALLBACK_HINT}
        dir={tab === "Ar" ? "rtl" : undefined}
      />
    </div>
  );
}

/**
 * react-hook-form variant — for the admin forms built on `register()`
 * (subscription plans, products, form builder, file requirements, summer camp).
 *
 * All three inputs stay mounted and the inactive ones are hidden with CSS
 * rather than unmounted. Swapping which input exists would work with
 * react-hook-form's default `shouldUnregister: false`, but hiding keeps the
 * registered values unambiguous and survives a future change to that option.
 */
export function LocaleFields({
  register,
  baseKey,
  label,
  multiline,
  rows,
  placeholder,
}: {
  register: UseFormRegister<FieldValues>;
  baseKey: string;
  label: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  const [tab, setTab] = useState<LocaleCode>("Fr");
  const Field = multiline ? Textarea : Input;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <TabStrip active={tab} onSelect={setTab} idPrefix={`lf-${baseKey}`} />
      </div>
      {LOCALES.map((l) => (
        <div key={l.code} className={l.code === tab ? undefined : "hidden"}>
          <Field
            {...register(keyFor(baseKey, l.code))}
            rows={rows}
            dir={l.code === "Ar" ? "rtl" : undefined}
            placeholder={l.code === "base" ? placeholder : FALLBACK_HINT}
          />
        </div>
      ))}
    </div>
  );
}
