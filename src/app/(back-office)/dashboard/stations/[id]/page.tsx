"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Phone, Mail, Users, Building2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ImageUrlInput } from "@/components/website/admin/ImageUrlInput";
import { LocaleTextInput } from "@/components/website/admin/LocaleTextInput";
import { useTranslation } from "react-i18next";

function formatDA(n: number) { return n.toLocaleString("fr-DZ") + " DA"; }

export default function StationDetailPage() {
  const { t } = useTranslation("stations");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: station, isLoading } = useQuery({
    queryKey: ["station", id],
    queryFn: () => fetch(`/api/stations/${id}`).then((r) => r.json()),
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [marketing, setMarketing] = useState<Record<string, unknown>>({});
  const setMarketingField = (patch: Record<string, unknown>) => setMarketing((m) => ({ ...m, ...patch }));

  const saveMarketingMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => fetch(`/api/stations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["station", id] }); toast.success(t("detail.public_saved")); },
    onError: () => toast.error(t("common:toast.save_failed")),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => fetch(`/api/stations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["station", id] }); toast.success(t("detail.updated")); setEditing(false); },
    onError: () => toast.error(t("common:toast.update_failed")),
  });

  const deleteMut = useMutation({
    mutationFn: () => fetch(`/api/stations/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success(t("detail.deleted")); router.push("/dashboard/stations"); },
  });

  useEffect(() => { if (station && !station.error) setMarketing(station); }, [station]);

  if (isLoading) return <div className="p-8 text-center text-sm text-gray-400">{t("common:ui.loading")}</div>;
  if (!station || station.error) return <div className="p-8 text-center text-sm text-red-400">{t("detail.not_found")}</div>;

  const startEdit = () => {
    setForm({ name: station.name, wilaya: station.wilaya, address: station.address, phone: station.phone, email: station.email, whatsapp: station.whatsapp });
    setEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/stations"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{station.name}</h1>
          <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{station.wilaya}</p>
        </div>
        <Badge variant={station.status === "active" ? "default" : "secondary"}>{station.status}</Badge>
        <Button variant="outline" onClick={startEdit}>{t("common:ui.edit")}</Button>
        <Button variant="destructive" onClick={() => { if (confirm("Delete this station?")) deleteMut.mutate(); }}>{t("common:ui.delete")}</Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("detail.overview")}</TabsTrigger>
          <TabsTrigger value="staff">Staff ({station.stationStaff?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="marketing">{t("detail.public")}</TabsTrigger>
          <TabsTrigger value="settings">{t("detail.settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">{t("common:nav.players")}</p><p className="text-2xl font-bold">{station._count?.players ?? 0}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">{t("common:ui.leads")}</p><p className="text-2xl font-bold">{station._count?.leads ?? 0}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">{t("detail.meetings")}</p><p className="text-2xl font-bold">{station._count?.meetings ?? 0}</p></CardContent></Card>
          </div>
          <Card>
            <CardContent className="pt-4 space-y-2">
              {station.address && <p className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-gray-400" />{station.address}</p>}
              {station.phone && <p className="text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" />{station.phone}</p>}
              {station.email && <p className="text-sm flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" />{station.email}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {station.stationStaff?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{t("detail.no_staff")}</p>
              ) : (
                <div className="space-y-2">
                  {station.stationStaff?.map((ss: any) => (
                    <div key={ss.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <Users className="h-4 w-4 text-gray-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{ss.user.name}</p>
                        <p className="text-xs text-gray-400">{ss.user.email}</p>
                      </div>
                      {ss.role && <Badge variant="secondary" className="ms-auto">{ss.role}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("detail.public_page")}</CardTitle>
                {station.slug && (
                  <a href={`/fr/venues/${station.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
                    View public page <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div>
                  <Label>{t("detail.show_public")}</Label>
                  <p className="text-xs text-gray-400">{t("detail.show_hint")}</p>
                </div>
                <Switch checked={!!marketing.isPubliclyListed} onCheckedChange={(v) => setMarketingField({ isPubliclyListed: v })} />
              </div>
              <div className="space-y-1">
                <Label>{t("detail.url_slug")}</Label>
                <Input value={(marketing.slug as string) ?? ""} onChange={(e) => setMarketingField({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} placeholder={t("detail.slug_ph")} />
              </div>
              <ImageUrlInput label={t("detail.hero_image")} value={(marketing.heroImageUrl as string) ?? ""} onChange={(url) => setMarketingField({ heroImageUrl: url })} />
              <LocaleTextInput baseKey="shortDescription" values={marketing} onChange={setMarketingField} label={t("detail.short_desc")} multiline />
              <LocaleTextInput baseKey="fullDescription" values={marketing} onChange={setMarketingField} label={t("detail.full_desc")} multiline />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>{t("detail.pitch_type")}</Label><Input value={(marketing.pitchType as string) ?? ""} onChange={(e) => setMarketingField({ pitchType: e.target.value })} placeholder={t("detail.pitch_ph")} /></div>
                <div className="space-y-1"><Label>{t("detail.changing_rooms")}</Label><Input value={(marketing.changingRooms as string) ?? ""} onChange={(e) => setMarketingField({ changingRooms: e.target.value })} /></div>
              </div>
              <div className="space-y-1">
                <Label>{t("detail.facilities")}</Label>
                <Textarea
                  value={Array.isArray(marketing.facilities) ? (marketing.facilities as string[]).join("\n") : (() => { try { return JSON.parse((marketing.facilities as string) ?? "[]").join("\n"); } catch { return ""; } })()}
                  onChange={(e) => setMarketingField({ facilities: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  placeholder={"3 full-size pitches\nIndoor training hall\nParking on site"}
                  rows={4}
                />
              </div>
              <div className="space-y-1"><Label>{t("detail.maps_url")}</Label><Input value={(marketing.googleMapsUrl as string) ?? ""} onChange={(e) => setMarketingField({ googleMapsUrl: e.target.value })} placeholder="https://maps.google.com/…" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>{t("detail.parking")}</Label><Textarea value={(marketing.parkingInfo as string) ?? ""} onChange={(e) => setMarketingField({ parkingInfo: e.target.value })} rows={2} /></div>
                <div className="space-y-1"><Label>{t("detail.transport")}</Label><Textarea value={(marketing.transportInfo as string) ?? ""} onChange={(e) => setMarketingField({ transportInfo: e.target.value })} rows={2} /></div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => saveMarketingMut.mutate(marketing)} disabled={saveMarketingMut.isPending}>{saveMarketingMut.isPending ? "Saving…" : "Save Public Page"}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          {editing ? (
            <Card>
              <CardHeader><CardTitle>{t("detail.edit_station")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1"><Label>{t("common:ui.name")}</Label><Input value={form.name ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
                  <div className="col-span-2 space-y-1"><Label>{t("common:ui.wilaya")}</Label><Input value={form.wilaya ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, wilaya: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>{t("common:ui.phone")}</Label><Input value={form.phone ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>{t("common:ui.whatsapp")}</Label><Input value={form.whatsapp ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, whatsapp: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>{t("common:ui.email")}</Label><Input value={form.email ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
                  <div className="col-span-2 space-y-1"><Label>{t("common:ui.address")}</Label><Input value={form.address ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, address: e.target.value }))} /></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditing(false)}>{t("common:ui.cancel")}</Button>
                  <Button onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}>{t("detail.save_changes")}</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-gray-400">{t("detail.click_edit")}</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
