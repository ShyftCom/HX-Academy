"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permission-names";
import { readJsonOrThrow, apiErrorMessage } from "@/lib/api-error";
import { DEFAULT_SEASON, parseDay, presetDays, type PeriodPreset, type SeasonBounds } from "@/lib/date-range";

export interface Period {
  preset: PeriodPreset;
  /** Used only when preset is "custom". */
  customFrom: string;
  customTo: string;
}

const PRESETS: PeriodPreset[] = ["this_month", "last_month", "this_year", "season", "all", "custom"];

const selectCls = "h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm";

export function useSeason() {
  return useQuery<SeasonBounds>({
    queryKey: ["finance-season"],
    queryFn: () => fetch("/api/finance/season").then(readJsonOrThrow<SeasonBounds>),
    staleTime: 10 * 60_000,
  });
}

/**
 * Resolves a period to the `dateFrom`/`dateTo` query params (both absent for
 * "all time"), or null while a custom range is incomplete or impossible.
 */
export function periodParams(period: Period, season: SeasonBounds | undefined): Record<string, string> | null {
  if (period.preset === "custom") {
    const from = parseDay(period.customFrom);
    const to = parseDay(period.customTo);
    if (!from || !to || from > to) return null;
    return { dateFrom: period.customFrom, dateTo: period.customTo };
  }
  const { from, to } = presetDays(period.preset, new Date(), season ?? DEFAULT_SEASON);
  return from && to ? { dateFrom: from, dateTo: to } : {};
}

/**
 * Quick period picker for the finance screens: one choice that every card,
 * chart and list on the page follows, instead of two date fields typed by hand
 * each time. "Période personnalisée" keeps the manual range.
 */
export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const { t } = useTranslation("finance");
  const { can } = usePermissions();
  const { data: season } = useSeason();
  const [seasonOpen, setSeasonOpen] = useState(false);
  const resolved = periodParams(value, season);
  const invalidCustom = value.preset === "custom" && !!value.customFrom && !!value.customTo && resolved === null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label={t("period.label")}
        className={selectCls}
        value={value.preset}
        onChange={(e) => onChange({ ...value, preset: e.target.value as PeriodPreset })}
      >
        {PRESETS.map((p) => <option key={p} value={p}>{t(`period.${p}`)}</option>)}
      </select>
      {value.preset === "custom" && (
        <>
          <Input type="date" aria-label={t("period.from")} className="h-9 w-40" value={value.customFrom} onChange={(e) => onChange({ ...value, customFrom: e.target.value })} />
          <span className="text-gray-400">—</span>
          <Input type="date" aria-label={t("period.to")} className="h-9 w-40" value={value.customTo} onChange={(e) => onChange({ ...value, customTo: e.target.value })} />
        </>
      )}
      {value.preset !== "custom" && value.preset !== "all" && resolved?.dateFrom && (
        <span className="text-xs text-gray-500">{formatDay(resolved.dateFrom)} — {formatDay(resolved.dateTo)}</span>
      )}
      {value.preset === "season" && can(PERMISSIONS.SETTINGS_EDIT) && (
        <Button variant="ghost" size="sm" onClick={() => setSeasonOpen(true)} title={t("period.edit_season")}>
          <Settings2 className="h-4 w-4" />
        </Button>
      )}
      {invalidCustom && <span className="text-xs text-red-500">{t("period.invalid_range")}</span>}
      {seasonOpen && season && <SeasonDialog season={season} onClose={() => setSeasonOpen(false)} />}
    </div>
  );
}

function formatDay(day: string) {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

function MonthDayPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { i18n } = useTranslation();
  const [mm, dd] = value.split("-");
  const monthName = (m: string) => new Date(2024, Number(m) - 1, 1).toLocaleDateString(i18n.language, { month: "long" });
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <select aria-label={label} className={selectCls} value={dd} onChange={(e) => onChange(`${mm}-${e.target.value}`)}>
          {DAYS.map((d) => <option key={d} value={d}>{Number(d)}</option>)}
        </select>
        <select aria-label={label} className={`${selectCls} flex-1`} value={mm} onChange={(e) => onChange(`${e.target.value}-${dd}`)}>
          {MONTHS.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
        </select>
      </div>
    </div>
  );
}

/** Super Admin setting: the season "Toute la saison sportive" follows, every year. */
function SeasonDialog({ season, onClose }: { season: SeasonBounds; onClose: () => void }) {
  const { t } = useTranslation("finance");
  const qc = useQueryClient();
  const [draft, setDraft] = useState(season);
  const save = useMutation({
    mutationFn: () => fetch("/api/finance/season", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }).then(readJsonOrThrow),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-season"] }); toast.success(t("period.season_saved")); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t, t("period.invalid_season"))),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("period.season_title")}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-gray-500">{t("period.season_hint")}</p>
          <MonthDayPicker label={t("period.season_start")} value={draft.start} onChange={(start) => setDraft((d) => ({ ...d, start }))} />
          <MonthDayPicker label={t("period.season_end")} value={draft.end} onChange={(end) => setDraft((d) => ({ ...d, end }))} />
          <Button className="w-full" loading={save.isPending} onClick={() => save.mutate()}>{t("common:bo.save_changes")}</Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
