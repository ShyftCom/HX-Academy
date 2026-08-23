"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ScheduleSlotEditor, type CoachOption, type SlotRow } from "@/components/website/admin/ScheduleSlotEditor";
import { LocaleTextInput } from "@/components/website/admin/LocaleTextInput";
import { ImageUrlInput } from "@/components/website/admin/ImageUrlInput";
import { useTranslation } from "react-i18next";

interface Category { id: string; name: string }
interface LocationOption { id: string; name: string; wilaya: string }
interface ProgrammeDetail {
  id: string; slug: string; name: string; nameFr: string | null; nameAr: string | null;
  shortDescription: string | null; shortDescriptionFr: string | null; shortDescriptionAr: string | null;
  fullDescription: string | null; fullDescriptionFr: string | null; fullDescriptionAr: string | null;
  heroImageUrl: string | null; cardImageUrl: string | null; categoryId: string | null;
  ageRangeLabel: string | null; ageRangeLabelFr: string | null; ageRangeLabelAr: string | null;
  priceLabel: string | null; priceLabelFr: string | null; priceLabelAr: string | null;
  promoBannerText: string | null; promoBannerTextFr: string | null; promoBannerTextAr: string | null; promoBannerUrl: string | null;
  bookingUrl: string | null; isFeatured: boolean; isPubliclyListed: boolean;
  metaTitle: string | null; metaDescription: string | null;
  schedules: SlotRow[];
}

/** Schedules belong to a location now, so a new row needs one — see addSchedule below. */
const NEW_SLOT = { ageGroup: "Under 8", sessionName: "Skills", day: "Monday", startTime: "17:30", endTime: "18:45", field: "", registrationStatus: "open", isActive: true };

export default function ProgrammeEditPage() {
  const { t } = useTranslation("website");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState("details");
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);

  const { data: programme, isLoading } = useQuery<ProgrammeDetail>({
    queryKey: ["admin-programme", id],
    queryFn: () => fetch(`/api/programmes/${id}`).then((r) => r.json()),
  });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["admin-programme-categories"], queryFn: () => fetch("/api/programmes/categories").then((r) => r.json()) });
  // The locations this user may schedule into — not /api/public/venues, which
  // hides unpublished branches and ignores per-user location scoping.
  const { data: locations = [] } = useQuery<LocationOption[]>({ queryKey: ["schedule-locations"], queryFn: () => fetch("/api/locations").then((r) => r.json()) });
  const { data: coaches = [] } = useQuery<CoachOption[]>({ queryKey: ["schedule-coaches"], queryFn: () => fetch("/api/coaches").then((r) => r.json()) });

  const [form, setForm] = useState<Record<string, unknown>>({});
  useEffect(() => { if (programme) setForm(programme as unknown as Record<string, unknown>); }, [programme]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-programme", id] });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => fetch(`/api/programmes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("common:toast.saved")); invalidate(); },
    onError: () => toast.error(t("common:toast.save_failed")),
  });

  const [schedules, setSchedules] = useState<SlotRow[]>([]);
  useEffect(() => { if (programme?.schedules) setSchedules(programme.schedules); }, [programme?.schedules]);

  /** Shared failure path so a rejected overlap explains which slot is in the way. */
  async function post(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error("request failed"), { payload });
    return payload;
  }

  function onWriteError(error: unknown) {
    const payload = (error as { payload?: { error?: string; conflict?: Record<string, string | null> } }).payload ?? {};
    if (payload.error === "schedule_time_order") toast.error(t("schedule.error_time_order"));
    else if (payload.error === "schedule_overlap") {
      const c = payload.conflict;
      toast.error(c
        ? t("schedule.error_overlap", { name: c.sessionName || c.ageGroup || "", day: c.day ?? "", start: c.startTime ?? "", end: c.endTime ?? "", field: c.field ?? "" })
        : t("schedule.error_overlap_generic"));
    } else toast.error(t("common:toast.save_failed"));
    invalidate();
  }

  const { mutate: addSchedule } = useMutation({
    // A slot must land somewhere: default to the first location the user can
    // reach, which they can then change on the row itself.
    mutationFn: () => post(`/api/programmes/${id}/schedule`, "POST", { ...NEW_SLOT, stationId: locations[0]?.id }),
    onSuccess: () => { toast.success(t("programmes.row_added")); invalidate(); },
    onError: onWriteError,
  });
  const { mutate: updateSchedule } = useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: Partial<SlotRow> }) =>
      post(`/api/programmes/${id}/schedule/${scheduleId}`, "PUT", data),
    onSuccess: () => invalidate(),
    onError: onWriteError,
  });
  const { mutate: deleteSchedule } = useMutation({
    mutationFn: (scheduleId: string) => post(`/api/programmes/${id}/schedule/${scheduleId}`, "DELETE"),
    onSuccess: () => { toast.success(t("programmes.row_removed")); invalidate(); setDeleteScheduleId(null); },
    onError: onWriteError,
  });
  const { mutate: persistOrder } = useMutation({
    mutationFn: (items: { id: string; order: number }[]) => post(`/api/programmes/${id}/schedule/reorder`, "PUT", { items }),
    onError: onWriteError,
  });

  function handleReorder(next: SlotRow[]) {
    setSchedules(next);
    persistOrder(next.map((s, i) => ({ id: s.id, order: i })));
  }

  if (isLoading || !programme) return <div className="py-12 text-center text-gray-500">{t("common:ui.loading_alt")}</div>;

  const set = (patch: Record<string, unknown>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/website/programmes")} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">{programme.name}</h1>
            <p className="font-mono text-xs text-gray-400">/programmes/{programme.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/fr/programmes/${programme.slug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" /> {t("common:ui.view")}</Button>
          </a>
          <Button size="sm" onClick={() => save()} disabled={saving}><Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="details">{t("programmes.details")}</TabsTrigger>
          <TabsTrigger value="schedule">Schedule ({schedules.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "details" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <LocaleTextInput baseKey="name" values={form} onChange={set} label={t("programmes.name_field")} />
            </div>
            <div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <LocaleTextInput baseKey="shortDescription" values={form} onChange={set} label={t("programmes.short_desc")} multiline />
              <LocaleTextInput baseKey="fullDescription" values={form} onChange={set} label={t("programmes.full_desc")} multiline />
            </div>
            <div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <p className="text-sm font-semibold">{t("programmes.promo_banner")}</p>
              <LocaleTextInput baseKey="promoBannerText" values={form} onChange={set} label={t("programmes.banner_heading")} />
              <div>
                <Label>{t("programmes.banner_link")}</Label>
                <Input value={(form.promoBannerUrl as string) ?? ""} onChange={(e) => set({ promoBannerUrl: e.target.value })} />
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <p className="text-sm font-semibold">{t("news.seo")}</p>
              <div><Label>{t("news.seo_title")}</Label><Input value={(form.metaTitle as string) ?? ""} onChange={(e) => set({ metaTitle: e.target.value })} /></div>
              <div><Label>{t("news.seo_description")}</Label><Textarea value={(form.metaDescription as string) ?? ""} onChange={(e) => set({ metaDescription: e.target.value })} /></div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <ImageUrlInput label={t("programmes.hero_image")} value={(form.heroImageUrl as string) ?? ""} onChange={(url) => set({ heroImageUrl: url })} />
              <ImageUrlInput label={t("programmes.card_image")} value={(form.cardImageUrl as string) ?? ""} onChange={(url) => set({ cardImageUrl: url })} />
            </div>
            <div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <div>
                <Label>{t("common:ui.category")}</Label>
                <Select value={(form.categoryId as string) ?? "none"} onValueChange={(v) => set({ categoryId: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("news.no_category")}</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <LocaleTextInput baseKey="ageRangeLabel" values={form} onChange={set} label={t("programmes.age_label")} />
              <LocaleTextInput baseKey="priceLabel" values={form} onChange={set} label={t("programmes.price_label")} />
              <div>
                <Label>{t("programmes.booking_override")}</Label>
                <Input value={(form.bookingUrl as string) ?? ""} onChange={(e) => set({ bookingUrl: e.target.value })} placeholder={t("programmes.booking_default")} />
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <div className="flex items-center justify-between"><Label>{t("programmes.published")}</Label><Switch checked={!!form.isPubliclyListed} onCheckedChange={(v) => set({ isPubliclyListed: v })} /></div>
              <div className="flex items-center justify-between"><Label>{t("common:ui.featured")}</Label><Switch checked={!!form.isFeatured} onCheckedChange={(v) => set({ isFeatured: v })} /></div>
            </div>
          </div>
        </div>
      )}

      {tab === "schedule" && (
        <div className="space-y-3">
          {/* Slots belong to locations now. This tab is the per-programme view of
              them and can span several; Website → Schedules is the per-location one. */}
          <p className="text-sm text-gray-500">{t("schedule.programme_tab_hint")}</p>
          {locations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500 dark:border-gray-700">{t("schedule.no_locations")}</div>
          ) : (
            <ScheduleSlotEditor
              slots={schedules}
              locations={locations}
              coaches={coaches}
              showLocation
              onReorder={handleReorder}
              onUpdate={(scheduleId, data) => updateSchedule({ scheduleId, data })}
              onDelete={setDeleteScheduleId}
              onAdd={() => addSchedule()}
              addLabel={t("programmes.add_schedule")}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteScheduleId}
        onOpenChange={() => setDeleteScheduleId(null)}
        title={t("programmes.remove_row")}
        description={t("programmes.remove_row_body")}
        onConfirm={() => deleteScheduleId && deleteSchedule(deleteScheduleId)}
        variant="destructive"
      />
    </div>
  );
}
