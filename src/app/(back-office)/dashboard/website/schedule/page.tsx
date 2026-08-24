"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Copy } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ScheduleSlotEditor, type CoachOption, type SlotRow } from "@/components/website/admin/ScheduleSlotEditor";
import { useTranslation } from "react-i18next";

/**
 * Location-scoped schedule editor.
 *
 * One location's schedule at a time: everything below the selector reads and
 * writes /api/locations/<selected>/schedule only, so editing location A can
 * never touch location B. The selector lists just the locations the signed-in
 * user may reach — a location-scoped admin sees their own branches and no others.
 */

interface LocationOption {
  id: string; name: string; wilaya: string; slug: string | null;
  isPubliclyListed: boolean; _count: { scheduleSlots: number };
}
interface ScheduleResponse { schedule: { id: string; isPublished: boolean } | null; slots: SlotRow[] }

const NEW_SLOT = { ageGroup: "Under 8", sessionName: "Skills", day: "Monday", startTime: "17:30", endTime: "18:45", field: "", registrationStatus: "open", isActive: true };

/** The API answers a conflict with the slot in the way; turn that into one sentence. */
function conflictMessage(t: (k: string, o?: Record<string, unknown>) => string, payload: { error?: string; conflict?: Record<string, string | null> }) {
  if (payload.error === "schedule_time_order") return t("schedule.error_time_order");
  const c = payload.conflict;
  if (!c) return t("schedule.error_overlap_generic");
  return t("schedule.error_overlap", {
    name: c.sessionName || c.ageGroup || "",
    day: c.day ?? "",
    start: c.startTime ?? "",
    end: c.endTime ?? "",
    field: c.field ?? "",
  });
}

export default function LocationSchedulePage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LocationScheduleContent />
    </Suspense>
  );
}

function LocationScheduleContent() {
  const { t } = useTranslation("website");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const { data: locations = [], isLoading: loadingLocations } = useQuery<LocationOption[]>({
    queryKey: ["schedule-locations"],
    queryFn: () => fetch("/api/locations").then((r) => r.json()),
  });
  const { data: coaches = [] } = useQuery<CoachOption[]>({
    queryKey: ["schedule-coaches"],
    queryFn: () => fetch("/api/coaches").then((r) => r.json()),
  });

  // The selected location lives in the URL, so the page is deep-linkable and
  // shareable and there is no local copy to keep in sync with it.
  const locationId = searchParams.get("location") ?? locations[0]?.id ?? "";

  function selectLocation(id: string) {
    router.replace(`${pathname}?location=${id}`, { scroll: false });
  }

  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [duplicateFrom, setDuplicateFrom] = useState<string>("");

  const { data, isLoading } = useQuery<ScheduleResponse>({
    queryKey: ["location-schedule", locationId],
    queryFn: () => fetch(`/api/locations/${locationId}/schedule`).then((r) => r.json()),
    enabled: !!locationId,
  });
  const slots = data?.slots ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["location-schedule", locationId] });
    qc.invalidateQueries({ queryKey: ["schedule-locations"] });
  };

  /** Every write shares one failure path so a rejected conflict always explains itself. */
  async function post(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error("request failed"), { payload, status: res.status });
    return payload;
  }

  function onWriteError(error: unknown) {
    const payload = (error as { payload?: { error?: string; conflict?: Record<string, string | null> } }).payload ?? {};
    if (payload.error === "schedule_overlap" || payload.error === "schedule_time_order") {
      toast.error(conflictMessage(t, payload));
    } else {
      toast.error(t("common:toast.save_failed"));
    }
    invalidate();
  }

  const { mutate: addSlot } = useMutation({
    mutationFn: () => post(`/api/locations/${locationId}/schedule`, "POST", NEW_SLOT),
    onSuccess: () => { toast.success(t("programmes.row_added")); invalidate(); },
    onError: onWriteError,
  });
  const { mutate: updateSlot } = useMutation({
    mutationFn: ({ slotId, data: patch }: { slotId: string; data: Partial<SlotRow> }) =>
      post(`/api/locations/${locationId}/schedule/${slotId}`, "PUT", patch),
    onSuccess: () => invalidate(),
    onError: onWriteError,
  });
  const { mutate: removeSlot } = useMutation({
    mutationFn: (slotId: string) => post(`/api/locations/${locationId}/schedule/${slotId}`, "DELETE"),
    onSuccess: () => { toast.success(t("programmes.row_removed")); invalidate(); setDeleteSlotId(null); },
    onError: onWriteError,
  });
  const { mutate: persistOrder } = useMutation({
    mutationFn: (items: { id: string; order: number }[]) => post(`/api/locations/${locationId}/schedule/reorder`, "PUT", { items }),
    onError: onWriteError,
  });
  const { mutate: duplicate, isPending: duplicating } = useMutation({
    mutationFn: () => post(`/api/locations/${locationId}/schedule/duplicate`, "POST", { sourceStationId: duplicateFrom }),
    onSuccess: (res: { copied: number; skipped: string[] }) => {
      toast.success(t("schedule.duplicated", { count: res.copied }));
      if (res.skipped?.length) toast.warning(t("schedule.duplicate_skipped", { groups: res.skipped.join(", ") }));
      setDuplicateFrom("");
      invalidate();
    },
    onError: onWriteError,
  });

  const selected = locations.find((l) => l.id === locationId);
  const others = locations.filter((l) => l.id !== locationId);

  return (
    <div className="space-y-6 pb-16">
      <PageHeader title={t("schedule.title")} description={t("schedule.subtitle")} />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="min-w-56">
          <label className="mb-1 block text-sm font-medium">{t("schedule.location")}</label>
          <Select value={locationId} onValueChange={selectLocation} disabled={locations.length === 0}>
            <SelectTrigger className="w-full"><SelectValue placeholder={t("schedule.select_location")} /></SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name} — {l.wilaya} ({l._count.scheduleSlots})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selected?.slug && (
          <a href={`/fr/venues/${selected.slug}`} target="_blank" rel="noopener noreferrer" className="pb-2 text-sm text-blue-600 hover:underline">
            {t("common:ui.view")}
          </a>
        )}
      </div>

      {!loadingLocations && locations.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-500 dark:border-gray-700">
          {t("schedule.no_locations")}
        </div>
      )}

      {locationId && isLoading && <div className="py-12 text-center text-gray-500">{t("common:ui.loading_alt")}</div>}

      {locationId && !isLoading && (
        <>
          {slots.length === 0 && (
            <div className="space-y-4 rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center dark:border-gray-700">
              <CalendarClock className="mx-auto h-8 w-8 text-gray-300" />
              <div>
                <p className="font-medium">{t("schedule.empty_title", { name: selected?.name ?? "" })}</p>
                <p className="mt-1 text-sm text-gray-500">{t("schedule.empty_body")}</p>
              </div>
              {others.length > 0 && (
                <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-2">
                  <Select value={duplicateFrom} onValueChange={setDuplicateFrom}>
                    <SelectTrigger className="w-56"><SelectValue placeholder={t("schedule.duplicate_from")} /></SelectTrigger>
                    <SelectContent>
                      {others.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l._count.scheduleSlots})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" disabled={!duplicateFrom || duplicating} onClick={() => duplicate()}>
                    <Copy className="h-4 w-4" /> {t("schedule.duplicate_action")}
                  </Button>
                </div>
              )}
            </div>
          )}

          <ScheduleSlotEditor
            slots={slots}
            locations={locations}
            coaches={coaches}
            onReorder={(next) => persistOrder(next.map((s, i) => ({ id: s.id, order: i })))}
            onUpdate={(slotId, patch) => updateSlot({ slotId, data: patch })}
            onDelete={setDeleteSlotId}
            onAdd={() => addSlot()}
            addLabel={t("schedule.add_slot")}
          />
        </>
      )}

      <ConfirmDialog
        open={!!deleteSlotId}
        onOpenChange={() => setDeleteSlotId(null)}
        title={t("programmes.remove_row")}
        description={t("programmes.remove_row_body")}
        onConfirm={() => deleteSlotId && removeSlot(deleteSlotId)}
        variant="destructive"
      />
    </div>
  );
}
