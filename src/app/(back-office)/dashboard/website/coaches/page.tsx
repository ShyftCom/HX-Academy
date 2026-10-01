"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SortableList } from "@/components/website/admin/SortableList";
import { ImageUrlInput } from "@/components/website/admin/ImageUrlInput";
import { useTranslation } from "react-i18next";
import { useStation } from "@/context/StationContext";
import { readJsonOrThrow, apiErrorMessage } from "@/lib/api-error";

interface Coach { id: string; fullName: string; role: string | null; bio: string | null; photoUrl: string | null; isActive: boolean; stationId: string | null }

export default function CoachesAdminPage() {
  const { t } = useTranslation("website");
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: coaches = [] } = useQuery<Coach[]>({ queryKey: ["admin-coaches"], queryFn: () => fetch("/api/coaches").then((r) => r.json()) });
  const [rows, setRows] = useState<Coach[] | null>(null);
  const list = rows ?? coaches;

  const { activeStationId, isGlobalView } = useStation();
  /** Only offered in the all-stations view; the header switcher wins otherwise. */
  const [stationFilter, setStationFilter] = useState("all");
  const { data: stations } = useQuery<{ id: string; name: string }[]>({ queryKey: ["stations"], queryFn: () => fetch("/api/stations").then((r) => r.json()), staleTime: 5 * 60_000 });
  const effectiveFilter = activeStationId ?? stationFilter;
  const filtered = effectiveFilter === "all" ? list : list.filter((c) => (effectiveFilter === "none" ? !c.stationId : c.stationId === effectiveFilter));
  // Reorder saves positions 0..n for the items it is given, so dragging within
  // a filtered subset would overwrite the global order. Only allow it unfiltered.
  const isFiltered = effectiveFilter !== "all";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-coaches"] });
  const { mutate: create } = useMutation({
    mutationFn: () => fetch("/api/coaches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "New Coach" }) }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("coaches.added")); invalidate(); },
  });
  const { mutate: update } = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Coach>) => fetch(`/api/coaches/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => invalidate(),
  });
  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/coaches/${id}`, { method: "DELETE" }).then(readJsonOrThrow),
    onSuccess: () => { toast.success(t("common:toast.deleted")); invalidate(); setDeleteId(null); },
    onError: (e) => toast.error(apiErrorMessage(e, t, t("common:toast.delete_failed"))),
  });

  // Mirror the change locally too: once reordered, `rows` shadows the query data.
  function setStation(id: string, stationId: string | null) {
    setRows((r) => r?.map((c) => (c.id === id ? { ...c, stationId } : c)) ?? null);
    update({ id, stationId });
  }

  const renderCoach = (c: Coach, dragHandle: React.ReactNode) => (
    <div className="mb-3 flex gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      {dragHandle}
      <div className="w-40 shrink-0">
        <ImageUrlInput value={c.photoUrl ?? ""} onChange={(url) => update({ id: c.id, photoUrl: url })} />
      </div>
      <div className="flex-1 space-y-2">
        <Input defaultValue={c.fullName} onBlur={(e) => update({ id: c.id, fullName: e.target.value })} placeholder={t("coaches.full_name")} />
        <Input defaultValue={c.role ?? ""} onBlur={(e) => update({ id: c.id, role: e.target.value })} placeholder={t("coaches.role_ph")} />
        <Select value={c.stationId ?? "none"} onValueChange={(v) => setStation(c.id, v === "none" ? null : v)}>
          <SelectTrigger><SelectValue placeholder={t("common:labels.station")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("coaches.no_station")}</SelectItem>
            {stations?.map((st) => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Textarea defaultValue={c.bio ?? ""} onBlur={(e) => update({ id: c.id, bio: e.target.value })} placeholder={t("coaches.bio")} rows={2} />
      </div>
      <div className="flex flex-col items-end justify-between">
        <Switch checked={c.isActive} onCheckedChange={(v) => update({ id: c.id, isActive: v })} />
        <button onClick={() => setDeleteId(c.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  function handleReorder(next: Coach[]) {
    setRows(next);
    fetch("/api/coaches/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: next.map((c, i) => ({ id: c.id, order: i })) }) }).then(invalidate);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("coaches.title")} description={t("coaches.subtitle")}>
        <Button onClick={() => create()}><Plus className="h-4 w-4" /> {t("coaches.add")}</Button>
      </PageHeader>

      {isGlobalView && list.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Select value={stationFilter} onValueChange={setStationFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder={t("coaches.all_stations")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("coaches.all_stations")}</SelectItem>
              <SelectItem value="none">{t("coaches.no_station")}</SelectItem>
              {stations?.map((st) => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {isFiltered && <p className="text-xs text-gray-500">{t("coaches.reorder_hint")}</p>}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState icon={UserCheck} title={t("coaches.empty")} description={t("coaches.empty_body")} action={{ label: t("coaches.add"), onClick: () => create() }} />
      ) : isFiltered ? (
        filtered.length === 0
          ? <p className="py-8 text-center text-sm text-gray-500">{t("coaches.none_for_station")}</p>
          : <div>{filtered.map((c) => <div key={c.id}>{renderCoach(c, null)}</div>)}</div>
      ) : (
        <SortableList items={list} onReorder={handleReorder} renderItem={(c, dragHandle) => renderCoach(c, dragHandle)} />
      )}

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title={t("coaches.delete")} description={t("coaches.delete_body")} onConfirm={() => deleteId && remove(deleteId)} loading={deleting} variant="destructive" />
    </div>
  );
}
