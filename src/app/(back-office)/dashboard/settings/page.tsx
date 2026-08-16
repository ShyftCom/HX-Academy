"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Save, Plus, Edit, Trash2 } from "lucide-react";
import { FullPageLoader } from "@/components/shared/loading-spinner";
import { SlickPaySettings } from "@/components/settings/slickpay-settings";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [methodModal, setMethodModal] = useState(false);
  const [editMethod, setEditMethod] = useState<any>(null);
  const [deleteMethodId, setDeleteMethodId] = useState<string | null>(null);
  const [methodForm, setMethodForm] = useState({ name: "", instructions: "", accountDetails: "", isActive: true });

  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: () => fetch("/api/settings").then((r) => r.json()) });
  const { data: methods, isLoading: methodsLoading } = useQuery({ queryKey: ["payment-methods"], queryFn: () => fetch("/api/payments/methods").then((r) => r.json()) });

  useEffect(() => { if (data) setSettings(data); }, [data]);

  const saveMutation = useMutation({
    mutationFn: (updates: Record<string, string>) => fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("settings.saved")); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: () => toast.error(t("common:toast.save_failed")),
  });

  const saveMethodMutation = useMutation({
    mutationFn: async () => {
      const url = editMethod ? `/api/payments/methods/${editMethod.id}` : "/api/payments/methods";
      const res = await fetch(url, { method: editMethod ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(methodForm) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast.success(editMethod ? "Method updated" : "Method created"); qc.invalidateQueries({ queryKey: ["payment-methods"] }); setMethodModal(false); setEditMethod(null); setMethodForm({ name: "", instructions: "", accountDetails: "", isActive: true }); },
    onError: () => toast.error(t("common:toast.save_failed")),
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/payments/methods/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success(t("common:toast.deleted")); qc.invalidateQueries({ queryKey: ["payment-methods"] }); setDeleteMethodId(null); },
    onError: () => toast.error(t("common:toast.delete_failed")),
  });

  const openEditMethod = (m: any) => { setEditMethod(m); setMethodForm({ name: m.name, instructions: m.instructions ?? "", accountDetails: m.accountDetails ?? "", isActive: m.isActive }); setMethodModal(true); };
  const openAddMethod = () => { setEditMethod(null); setMethodForm({ name: "", instructions: "", accountDetails: "", isActive: true }); setMethodModal(true); };

  const upd = (key: string, val: string) => setSettings((s) => ({ ...s, [key]: val }));

  if (isLoading) return <FullPageLoader />;

  const methodColumns = [
    { key: "name", header: "Method", cell: (r: any) => <p className="font-medium text-sm">{r.name}</p> },
    { key: "instructions", header: "Instructions", cell: (r: any) => <p className="text-xs text-gray-500 truncate max-w-xs">{r.instructions ?? "—"}</p> },
    { key: "status", header: "Active", cell: (r: any) => <Switch checked={r.isActive} onCheckedChange={(v) => fetch(`/api/payments/methods/${r.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...r, isActive: v }) }).then(() => qc.invalidateQueries({ queryKey: ["payment-methods"] }))} /> },
    { key: "actions", header: "", cell: (r: any) => (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => openEditMethod(r)}><Edit className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="sm" className="text-red-600" onClick={() => setDeleteMethodId(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">{t("settings.general")}</TabsTrigger>
          <TabsTrigger value="branding">{t("settings.branding")}</TabsTrigger>
          <TabsTrigger value="payments">{t("settings.payment_methods")}</TabsTrigger>
          <TabsTrigger value="slickpay">{t("settings.slickpay.tab")}</TabsTrigger>
          <TabsTrigger value="social">{t("settings.social")}</TabsTrigger>
          <TabsTrigger value="legal">{t("settings.legal")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card><CardContent className="pt-5 space-y-4 max-w-2xl">
            <Input label={t("settings.academy_name")} value={settings.academy_name ?? ""} onChange={(e) => upd("academy_name", e.target.value)} placeholder="HX Academy" />
            <Input label={t("common:ui.email")} type="email" value={settings.academy_email ?? ""} onChange={(e) => upd("academy_email", e.target.value)} placeholder="contact@hxacademy.com" />
            <Input label={t("common:ui.phone")} value={settings.academy_phone ?? ""} onChange={(e) => upd("academy_phone", e.target.value)} placeholder="+213 ..." />
            <Input label={t("settings.whatsapp")} value={settings.academy_whatsapp ?? ""} onChange={(e) => upd("academy_whatsapp", e.target.value)} placeholder="+213 ..." />
            <Textarea label={t("common:ui.address")} value={settings.academy_address ?? ""} onChange={(e) => upd("academy_address", e.target.value)} placeholder="Algiers, Algeria" rows={2} />
            <Input label={t("settings.currency_symbol")} value={settings.currency_symbol ?? ""} onChange={(e) => upd("currency_symbol", e.target.value)} placeholder="DA" />
            <Button onClick={() => saveMutation.mutate(settings)} loading={saveMutation.isPending}><Save className="me-2 h-4 w-4" />{t("settings.save_general")}</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card><CardContent className="pt-5 space-y-4 max-w-2xl">
            <div>
              <Input label={t("settings.logo_url")} value={settings.academy_logo ?? ""} onChange={(e) => upd("academy_logo", e.target.value)} placeholder="https://..." />
              {settings.academy_logo && <img src={settings.academy_logo} alt={t("settings.logo_preview")} className="mt-2 h-16 object-contain rounded-lg border dark:border-gray-700" />}
            </div>
            <Input label={t("settings.favicon_url")} value={settings.academy_favicon ?? ""} onChange={(e) => upd("academy_favicon", e.target.value)} placeholder="https://..." />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("settings.primary_color")}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.primary_color ?? "#1e40af"} onChange={(e) => upd("primary_color", e.target.value)} className="h-9 w-16 rounded cursor-pointer border border-gray-200 dark:border-gray-700" />
                  <Input value={settings.primary_color ?? ""} onChange={(e) => upd("primary_color", e.target.value)} placeholder="#1e40af" className="flex-1" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("settings.secondary_color")}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.secondary_color ?? "#0f172a"} onChange={(e) => upd("secondary_color", e.target.value)} className="h-9 w-16 rounded cursor-pointer border border-gray-200 dark:border-gray-700" />
                  <Input value={settings.secondary_color ?? ""} onChange={(e) => upd("secondary_color", e.target.value)} placeholder="#0f172a" className="flex-1" />
                </div>
              </div>
            </div>
            <Button onClick={() => saveMutation.mutate(settings)} loading={saveMutation.isPending}><Save className="me-2 h-4 w-4" />{t("settings.save_branding")}</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payments">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openAddMethod}><Plus className="me-2 h-4 w-4" />{t("settings.add_method")}</Button>
            </div>
            <DataTable columns={methodColumns} data={methods ?? []} loading={methodsLoading} emptyMessage={t("settings.no_methods")} />
          </div>
        </TabsContent>

        <TabsContent value="slickpay">
          <SlickPaySettings />
        </TabsContent>

        <TabsContent value="social">
          <Card><CardContent className="pt-5 space-y-4 max-w-2xl">
            {[["Instagram URL", "social_instagram"], ["Facebook URL", "social_facebook"], ["YouTube URL", "social_youtube"], ["Twitter/X URL", "social_twitter"], ["TikTok URL", "social_tiktok"]].map(([label, key]) => (
              <Input key={key} label={label} value={settings[key] ?? ""} onChange={(e) => upd(key, e.target.value)} placeholder="https://..." />
            ))}
            <Button onClick={() => saveMutation.mutate(settings)} loading={saveMutation.isPending}><Save className="me-2 h-4 w-4" />{t("settings.save_social")}</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="legal">
          <Card><CardContent className="pt-5 space-y-4 max-w-2xl">
            <Input label={t("settings.terms_url")} value={settings.terms_url ?? ""} onChange={(e) => upd("terms_url", e.target.value)} placeholder="https://..." />
            <Input label={t("settings.privacy_url")} value={settings.privacy_url ?? ""} onChange={(e) => upd("privacy_url", e.target.value)} placeholder="https://..." />
            <Textarea label={t("settings.footer_text")} value={settings.footer_text ?? ""} onChange={(e) => upd("footer_text", e.target.value)} placeholder={t("settings.footer_ph")} rows={2} />
            <Button onClick={() => saveMutation.mutate(settings)} loading={saveMutation.isPending}><Save className="me-2 h-4 w-4" />{t("settings.save_legal")}</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={methodModal} onOpenChange={setMethodModal}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{editMethod ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input label={t("settings.method_name")} value={methodForm.name} onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })} placeholder={t("settings.method_ph")} />
            <Textarea label={t("settings.instructions")} value={methodForm.instructions} onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })} placeholder={t("settings.instructions_ph")} rows={3} />
            <Textarea label={t("settings.account_details")} value={methodForm.accountDetails} onChange={(e) => setMethodForm({ ...methodForm, accountDetails: e.target.value })} placeholder={t("settings.account_ph")} rows={2} />
            <div className="flex items-center gap-3">
              <Switch checked={methodForm.isActive} onCheckedChange={(v) => setMethodForm({ ...methodForm, isActive: v })} />
              <span className="text-sm">{t("common:ui.active")}</span>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMethodModal(false)}>{t("common:ui.cancel")}</Button>
            <Button onClick={() => saveMethodMutation.mutate()} loading={saveMethodMutation.isPending} disabled={!methodForm.name}>{editMethod ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteMethodId} onOpenChange={(o) => !o && setDeleteMethodId(null)} title={t("settings.delete_method")} description={t("settings.are_you_sure")} confirmLabel={t("common:ui.delete")} onConfirm={() => deleteMethodId && deleteMethodMutation.mutate(deleteMethodId)} loading={deleteMethodMutation.isPending} />
    </div>
  );
}
