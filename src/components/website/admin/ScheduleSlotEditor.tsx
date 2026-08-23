"use client";

import { useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortableList } from "@/components/website/admin/SortableList";
import { useTranslation } from "react-i18next";

/**
 * The schedule row editor, shared by the location schedule page and the Schedule
 * tab of the programme editor.
 *
 * Same controls the programme tab has always used — inline inputs, selects and a
 * drag handle — made location-aware and extended with the two fields the
 * conflict rule needs (weekday and pitch) plus an active toggle for the isActive
 * column, which existed in the schema but had no control.
 *
 * The parent owns the mutations, because the two callers post to different
 * endpoints; this component owns only the optimistic row state.
 */

export interface SlotRow {
  id: string;
  stationId: string;
  station?: { id: string; name: string } | null;
  ageGroup: string;
  sessionName: string | null;
  day: string | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  field: string;
  capacity: number | null;
  coachId: string | null;
  price: number | null;
  registrationStatus: string;
  isActive: boolean;
}

export interface LocationOption { id: string; name: string }
export interface CoachOption { id: string; fullName: string }

/** 0 = Sunday … 6 = Saturday, matching the dayOfWeek column. */
export const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const CUSTOM_DAY = "custom";

export function ScheduleSlotEditor({
  slots,
  locations,
  coaches,
  showLocation = false,
  onReorder,
  onUpdate,
  onDelete,
  onAdd,
  addLabel,
}: {
  slots: SlotRow[];
  locations: LocationOption[];
  coaches: CoachOption[];
  /** Show a location column — only useful where rows can span locations (the programme tab). */
  showLocation?: boolean;
  onReorder: (next: SlotRow[]) => void;
  onUpdate: (slotId: string, data: Partial<SlotRow> & { day?: string | null }) => void;
  onDelete: (slotId: string) => void;
  onAdd: () => void;
  addLabel: string;
}) {
  const { t } = useTranslation("website");

  // Local copy so typing stays responsive between blur-saves, re-synced whenever
  // the server sends a new list. Adjusted during render rather than in an effect
  // (https://react.dev/learn/you-might-not-need-an-effect) so a refetch does not
  // cost an extra render pass.
  const [rows, setRows] = useState<SlotRow[]>(slots);
  const [lastServerSlots, setLastServerSlots] = useState<SlotRow[]>(slots);
  if (lastServerSlots !== slots) {
    setLastServerSlots(slots);
    setRows(slots);
  }

  const patchLocal = (id: string, patch: Partial<SlotRow>) => setRows((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  function handleReorder(next: SlotRow[]) {
    setRows(next);
    onReorder(next);
  }

  /** The select shows a weekday, or "Other" for free text like "Monday-Friday". */
  function daySelectValue(row: SlotRow) {
    if (row.dayOfWeek != null) return String(row.dayOfWeek);
    return row.day ? CUSTOM_DAY : "";
  }

  function handleDayChange(row: SlotRow, value: string) {
    if (value === CUSTOM_DAY) {
      // Clear rather than keep the weekday, so the free-text box starts empty
      // instead of showing a value the select no longer claims. Nothing is saved
      // until the box blurs, so an accidental click costs nothing.
      patchLocal(row.id, { dayOfWeek: null, day: "" });
      return;
    }
    // Send the canonical English name: the server derives dayOfWeek from it, and
    // the public table renders whatever string is stored.
    const key = DAY_KEYS[Number(value)];
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    patchLocal(row.id, { dayOfWeek: Number(value), day: label });
    onUpdate(row.id, { day: label });
  }

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <SortableList
          items={rows}
          onReorder={handleReorder}
          renderItem={(row: SlotRow, dragHandle: React.ReactNode) => (
            <div className={`mb-2 flex flex-wrap items-center gap-2 rounded-lg border p-3 ${row.isActive ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" : "border-dashed border-gray-300 bg-gray-50 opacity-70 dark:border-gray-700 dark:bg-gray-950"}`}>
              {dragHandle}

              <Input
                className="w-28"
                value={row.ageGroup}
                onChange={(e) => patchLocal(row.id, { ageGroup: e.target.value })}
                onBlur={(e) => onUpdate(row.id, { ageGroup: e.target.value })}
                placeholder={t("programmes.age_group")}
              />
              <Input
                className="w-28"
                value={row.sessionName ?? ""}
                onChange={(e) => patchLocal(row.id, { sessionName: e.target.value })}
                onBlur={(e) => onUpdate(row.id, { sessionName: e.target.value })}
                placeholder={t("programmes.session")}
              />

              <Select value={daySelectValue(row)} onValueChange={(v) => handleDayChange(row, v)}>
                <SelectTrigger className="w-32"><SelectValue placeholder={t("programmes.day")} /></SelectTrigger>
                <SelectContent>
                  {DAY_KEYS.map((key, i) => <SelectItem key={key} value={String(i)}>{t(`schedule.days.${key}`)}</SelectItem>)}
                  <SelectItem value={CUSTOM_DAY}>{t("schedule.day_other")}</SelectItem>
                </SelectContent>
              </Select>

              {/* Free text is kept for values that name a range rather than a day
                  ("Monday-Friday"). Those sit outside the per-day conflict rule,
                  so the row says so instead of appearing to be checked. */}
              {row.dayOfWeek == null && row.day !== null && (
                <div className="flex items-center gap-1">
                  <Input
                    className="w-32"
                    value={row.day ?? ""}
                    onChange={(e) => patchLocal(row.id, { day: e.target.value })}
                    onBlur={(e) => onUpdate(row.id, { day: e.target.value })}
                    placeholder={t("programmes.day")}
                  />
                  <span title={t("schedule.no_conflict_check")}>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </span>
                </div>
              )}

              <Input
                className="w-24"
                value={row.startTime ?? ""}
                onChange={(e) => patchLocal(row.id, { startTime: e.target.value })}
                onBlur={(e) => onUpdate(row.id, { startTime: e.target.value })}
                placeholder="17:30"
              />
              <Input
                className="w-24"
                value={row.endTime ?? ""}
                onChange={(e) => patchLocal(row.id, { endTime: e.target.value })}
                onBlur={(e) => onUpdate(row.id, { endTime: e.target.value })}
                placeholder="18:45"
              />
              <Input
                className="w-28"
                value={row.field ?? ""}
                onChange={(e) => patchLocal(row.id, { field: e.target.value })}
                onBlur={(e) => onUpdate(row.id, { field: e.target.value })}
                placeholder={t("schedule.field")}
                title={t("schedule.field_hint")}
              />

              {showLocation && (
                <Select value={row.stationId} onValueChange={(v) => onUpdate(row.id, { stationId: v })}>
                  <SelectTrigger className="w-36"><SelectValue placeholder={t("programmes.venue")} /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              <Select value={row.coachId ?? "none"} onValueChange={(v) => onUpdate(row.id, { coachId: v === "none" ? null : v })}>
                <SelectTrigger className="w-32"><SelectValue placeholder={t("schedule.coach")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("schedule.no_coach")}</SelectItem>
                  {coaches.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}
                </SelectContent>
              </Select>

              <Input
                className="w-20"
                type="number"
                value={row.capacity ?? ""}
                onChange={(e) => patchLocal(row.id, { capacity: e.target.value ? Number(e.target.value) : null })}
                onBlur={(e) => onUpdate(row.id, { capacity: e.target.value ? Number(e.target.value) : null })}
                placeholder={t("schedule.capacity")}
              />
              <Input
                className="w-24"
                type="number"
                value={row.price ?? ""}
                onChange={(e) => patchLocal(row.id, { price: e.target.value ? Number(e.target.value) : null })}
                onBlur={(e) => onUpdate(row.id, { price: e.target.value ? Number(e.target.value) : null })}
                placeholder={t("common:labels.price")}
              />

              <Select value={row.registrationStatus} onValueChange={(v) => onUpdate(row.id, { registrationStatus: v })}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{t("programmes.status_open")}</SelectItem>
                  <SelectItem value="waitlist">{t("programmes.status_waitlist")}</SelectItem>
                  <SelectItem value="full">{t("programmes.status_full")}</SelectItem>
                  <SelectItem value="closed">{t("programmes.status_closed")}</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2" title={t("schedule.active_hint")}>
                <Switch checked={row.isActive} onCheckedChange={(v) => { patchLocal(row.id, { isActive: v }); onUpdate(row.id, { isActive: v }); }} />
                <span className="text-xs text-gray-500">{row.isActive ? t("schedule.active") : t("schedule.inactive")}</span>
              </div>

              <button
                onClick={() => onDelete(row.id)}
                className="ms-auto flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                aria-label={t("programmes.remove_row")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        />
      )}

      <Button variant="outline" onClick={onAdd} className="w-full border-dashed">
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}
