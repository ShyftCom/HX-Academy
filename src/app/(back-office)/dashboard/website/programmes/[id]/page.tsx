"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SortableList } from "@/components/website/admin/SortableList";
import { LocaleTextInput } from "@/components/website/admin/LocaleTextInput";
import { ImageUrlInput } from "@/components/website/admin/ImageUrlInput";
import { useTranslation } from "react-i18next";

interface ScheduleRow {
  id: string; ageGroup: string; minAge: number | null; maxAge: number | null;
  sessionName: string | null; day: string | null; startTime: string | null; endTime: string | null;
  venueId: string | null; price: number | null; registrationStatus: string;
}
interface Category { id: string; name: string }
interface Venue { id: string; name: string }
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
  schedules: ScheduleRow[];
}

const EMPTY_SCHEDULE = { ageGroup: "Under 8", minAge: null, maxAge: null, sessionName: "Skills", day: "Monday", startTime: "17:30", endTime: "18:45", venueId: null, price: null, registrationStatus: "open" };

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
  const { data: venues = [] } = useQuery<Venue[]>({ queryKey: ["admin-venues-lite"], queryFn: () => fetch("/api/public/venues").then((r) => r.json()) });

  const [form, setForm] = useState<Record<string, unknown>>({});
  useEffect(() => { if (programme) setForm(programme as unknown as Record<string, unknown>); }, [programme]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-programme", id] });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => fetch(`/api/programmes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("common:toast.saved")); invalidate(); },
    onError: () => toast.error(t("common:toast.save_failed")),
  });

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  useEffect(() => { if (programme?.schedules) setSchedules(programme.schedules); }, [programme?.schedules]);

  const { mutate: addSchedule } = useMutation({
    mutationFn: () => fetch(`/api/programmes/${id}/schedule`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(EMPTY_SCHEDULE) }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("programmes.row_added")); invalidate(); },
  });
  const { mutate: updateSchedule } = useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: Partial<ScheduleRow> }) =>
      fetch(`/api/programmes/${id}/schedule/${scheduleId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => invalidate(),
  });
  const { mutate: deleteSchedule } = useMutation({
    mutationFn: (scheduleId: string) => fetch(`/api/programmes/${id}/schedule/${scheduleId}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("programmes.row_removed")); invalidate(); setDeleteScheduleId(null); },
  });
  const { mutate: persistOrder } = useMutation({
    mutationFn: (items: { id: string; order: number }[]) =>
      fetch(`/api/programmes/${id}/schedule/reorder`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) }).then((r) => r.json()),
  });

  function handleReorder(next: ScheduleRow[]) {
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
          {schedules.length > 0 && (
            <SortableList
              items={schedules}
              onReorder={handleReorder}
              renderItem={(row, dragHandle) => (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  {dragHandle}
                  <Input className="w-28" value={row.ageGroup} onChange={(e) => setSchedules((s) => s.map((r) => (r.id === row.id ? { ...r, ageGroup: e.target.value } : r)))} onBlur={(e) => updateSchedule({ scheduleId: row.id, data: { ageGroup: e.target.value } })} placeholder={t("programmes.age_group")} />
                  <Input className="w-28" value={row.sessionName ?? ""} onChange={(e) => setSchedules((s) => s.map((r) => (r.id === row.id ? { ...r, sessionName: e.target.value } : r)))} onBlur={(e) => updateSchedule({ scheduleId: row.id, data: { sessionName: e.target.value } })} placeholder={t("programmes.session")} />
                  <Input className="w-28" value={row.day ?? ""} onChange={(e) => setSchedules((s) => s.map((r) => (r.id === row.id ? { ...r, day: e.target.value } : r)))} onBlur={(e) => updateSchedule({ scheduleId: row.id, data: { day: e.target.value } })} placeholder={t("programmes.day")} />
                  <Input className="w-24" value={row.startTime ?? ""} onChange={(e) => setSchedules((s) => s.map((r) => (r.id === row.id ? { ...r, startTime: e.target.value } : r)))} onBlur={(e) => updateSchedule({ scheduleId: row.id, data: { startTime: e.target.value } })} placeholder="17:30" />
                  <Input className="w-24" value={row.endTime ?? ""} onChange={(e) => setSchedules((s) => s.map((r) => (r.id === row.id ? { ...r, endTime: e.target.value } : r)))} onBlur={(e) => updateSchedule({ scheduleId: row.id, data: { endTime: e.target.value } })} placeholder="18:45" />
                  <Select value={row.venueId ?? "none"} onValueChange={(v) => updateSchedule({ scheduleId: row.id, data: { venueId: v === "none" ? null : v } })}>
                    <SelectTrigger className="w-36"><SelectValue placeholder={t("programmes.venue")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("programmes.no_venue")}</SelectItem>
                      {venues.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="w-24" type="number" value={row.price ?? ""} onChange={(e) => setSchedules((s) => s.map((r) => (r.id === row.id ? { ...r, price: e.target.value ? Number(e.target.value) : null } : r)))} onBlur={(e) => updateSchedule({ scheduleId: row.id, data: { price: e.target.value ? Number(e.target.value) : null } })} placeholder={t("common:labels.price")} />
                  <Select value={row.registrationStatus} onValueChange={(v) => updateSchedule({ scheduleId: row.id, data: { registrationStatus: v } })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{t("programmes.status_open")}</SelectItem>
                      <SelectItem value="waitlist">{t("programmes.status_waitlist")}</SelectItem>
                      <SelectItem value="full">{t("programmes.status_full")}</SelectItem>
                      <SelectItem value="closed">{t("programmes.status_closed")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <button onClick={() => setDeleteScheduleId(row.id)} className="ms-auto flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            />
          )}
          <Button variant="outline" onClick={() => addSchedule()} className="w-full border-dashed">
            <Plus className="h-4 w-4" /> {t("programmes.add_schedule")}
          </Button>
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
