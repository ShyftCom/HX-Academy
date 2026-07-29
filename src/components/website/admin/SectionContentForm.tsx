"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LocaleTextInput } from "./LocaleTextInput";
import { ImageUrlInput } from "./ImageUrlInput";
import { SortableList } from "./SortableList";
import type { FieldDef } from "@/components/website/sections/sectionFieldSchemas";

let uidCounter = 0;
function uid() {
  uidCounter += 1;
  return `row_${Date.now()}_${uidCounter}`;
}

function Field({ field, value, onChange }: { field: FieldDef; value: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  if (field.kind === "text" || field.kind === "textarea") {
    if (field.multilocale) {
      return <LocaleTextInput baseKey={field.key} values={value} onChange={onChange} label={field.label} multiline={field.kind === "textarea"} />;
    }
    const Comp = field.kind === "textarea" ? Textarea : Input;
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{field.label}</label>
        <Comp value={(value[field.key] as string) ?? ""} onChange={(e) => onChange({ ...value, [field.key]: e.target.value })} />
        {field.help && <p className="text-[11px] text-gray-400">{field.help}</p>}
      </div>
    );
  }
  if (field.kind === "url") {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{field.label}</label>
        <Input value={(value[field.key] as string) ?? ""} onChange={(e) => onChange({ ...value, [field.key]: e.target.value })} placeholder="/programmes or https://…" />
      </div>
    );
  }
  if (field.kind === "number") {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{field.label}</label>
        <Input type="number" step="0.05" value={(value[field.key] as number) ?? ""} onChange={(e) => onChange({ ...value, [field.key]: e.target.value === "" ? undefined : Number(e.target.value) })} />
      </div>
    );
  }
  if (field.kind === "image") {
    return <ImageUrlInput label={field.label} value={(value[field.key] as string) ?? ""} onChange={(url) => onChange({ ...value, [field.key]: url })} />;
  }
  if (field.kind === "select") {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{field.label}</label>
        <select
          value={(value[field.key] as string) ?? ""}
          onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
          className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }
  if (field.kind === "list") {
    const rows: Record<string, unknown>[] = Array.isArray(value[field.key]) ? (value[field.key] as Record<string, unknown>[]) : [];
    const rowsWithIds = rows.map((r) => (r.id ? r : { ...r, id: uid() }));
    return (
      <div className="space-y-2 rounded-lg border border-dashed border-gray-200 p-3 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{field.label}</label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange({ ...value, [field.key]: [...rowsWithIds, { id: uid() }] })}
          >
            <Plus className="h-3.5 w-3.5" /> Add {field.itemLabel}
          </Button>
        </div>
        {rowsWithIds.length > 0 && (
          <SortableList
            items={rowsWithIds as { id: string }[]}
            onReorder={(next) => onChange({ ...value, [field.key]: next })}
            renderItem={(row, dragHandle) => (
              <div className="mb-2 flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
                {dragHandle}
                <div className="flex-1 space-y-3">
                  {field.itemFields.map((sub) => (
                    <Field
                      key={sub.key}
                      field={sub}
                      value={row as Record<string, unknown>}
                      onChange={(nextRow) => {
                        const next = rowsWithIds.map((r) => (r.id === row.id ? nextRow : r));
                        onChange({ ...value, [field.key]: next });
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...value, [field.key]: rowsWithIds.filter((r) => r.id !== row.id) })}
                  className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  aria-label={`Remove ${field.itemLabel}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          />
        )}
      </div>
    );
  }
  return null;
}

export function SectionContentForm({ schema, value, onChange }: { schema: FieldDef[]; value: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-5">
      {schema.map((field) => (
        <Field key={field.key} field={field} value={value} onChange={onChange} />
      ))}
    </div>
  );
}
