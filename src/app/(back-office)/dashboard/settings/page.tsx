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

export default function SettingsPage() {
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
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: () => toast.error("Save failed"),
  });

  const saveMethodMutation = useMutation({
    mutationFn: async () => {
      const url = editMethod ? `/api/payments/methods/${editMethod.id}` : "/api/payments/methods";
      const res = await fetch(url, { method: editMethod ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(methodForm) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast.success(editMethod ? "Method updated" : "Method created"); qc.invalidateQueries({ queryKey: ["payment-methods"] }); setMethodModal(false); setEditMethod(null); setMethodForm({ name: "", instructions: "", accountDetails: "", isActive: true }); },
    onError: () => toast.error("Save failed"),
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/payments/methods/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["payment-methods"] }); setDeleteMethodId(null); },
    onError: () => toast.error("Delete failed"),
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
      <PageHeader title="Settings" description="Configure your academy" />

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="social">Social Links</TabsTrigger>
          <TabsTrigger value="legal">Terms & Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card><CardContent className="pt-5 space-y-4 max-w-2xl">
            <Input label="Academy Name" value={settings.academy_name ?? ""} onChange={(e) => upd("academy_name", e.target.value)} placeholder="HX Academy" />
            <Input label="Email" type="email" value={settings.academy_email ?? ""} onChange={(e) => upd("academy_email", e.target.value)} placeholder="contact@hxacademy.com" />
            <Input label="Phone" value={settings.academy_phone ?? ""} onChange={(e) => upd("academy_phone", e.target.value)} placeholder="+213 ..." />
            <Input label="WhatsApp" value={settings.academy_whatsapp ?? ""} onChange={(e) => upd("academy_whatsapp", e.target.value)} placeholder="+213 ..." />
            <Textarea label="Address" value={settings.academy_address ?? ""} onChange={(e) => upd("academy_address", e.target.value)} placeholder="Algiers, Algeria" rows={2} />
            <Input label="Currency Symbol" value={settings.currency_symbol ?? ""} onChange={(e) => upd("currency_symbol", e.target.value)} placeholder="DA" />
            <Button onClick={() => saveMutation.mutate(settings)} loading={saveMutation.isPending}><Save className="mr-2 h-4 w-4" />Save General Settings</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card><CardContent className="pt-5 space-y-4 max-w-2xl">
            <div>
              <Input label="Logo URL" value={settings.academy_logo ?? ""} onChange={(e) => upd("academy_logo", e.target.value)} placeholder="https://..." />
              {settings.academy_logo && <img src={settings.academy_logo} alt="Logo preview" className="mt-2 h-16 object-contain rounded-lg border dark:border-gray-700" />}
            </div>
            <Input label="Favicon URL" value={settings.academy_favicon ?? ""} onChange={(e) => upd("academy_favicon", e.target.value)} placeholder="https://..." />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.primary_color ?? "#1e40af"} onChange={(e) => upd("primary_color", e.target.value)} className="h-9 w-16 rounded cursor-pointer border border-gray-200 dark:border-gray-700" />
                  <Input value={settings.primary_color ?? ""} onChange={(e) => upd("primary_color", e.target.value)} placeholder="#1e40af" className="flex-1" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.secondary_color ?? "#0f172a"} onChange={(e) => upd("secondary_color", e.target.value)} className="h-9 w-16 rounded cursor-pointer border border-gray-200 dark:border-gray-700" />
                  <Input value={settings.secondary_color ?? ""} onChange={(e) => upd("secondary_color", e.target.value)} placeholder="#0f172a" className="flex-1" />
                </div>
              </div>
            </div>
            <Button onClick={() => saveMutation.mutate(settings)} loading={saveMutation.isPending}><Save className="mr-2 h-4 w-4" />Save Branding</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payments">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openAddMethod}><Plus className="mr-2 h-4 w-4" />Add Method</Button>
            </div>
            <DataTable columns={methodColumns} data={methods ?? []} loading={methodsLoading} emptyMessage="No payment methods configured" />
          </div>
        </TabsContent>

        <TabsContent value="social">
          <Card><CardContent className="pt-5 space-y-4 max-w-2xl">
            {[["Instagram URL", "social_instagram"], ["Facebook URL", "social_facebook"], ["YouTube URL", "social_youtube"], ["Twitter/X URL", "social_twitter"], ["TikTok URL", "social_tiktok"]].map(([label, key]) => (
              <Input key={key} label={label} value={settings[key] ?? ""} onChange={(e) => upd(key, e.target.value)} placeholder="https://..." />
            ))}
            <Button onClick={() => saveMutation.mutate(settings)} loading={saveMutation.isPending}><Save className="mr-2 h-4 w-4" />Save Social Links</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="legal">
          <Card><CardContent className="pt-5 space-y-4 max-w-2xl">
            <Input label="Terms of Service URL" value={settings.terms_url ?? ""} onChange={(e) => upd("terms_url", e.target.value)} placeholder="https://..." />
            <Input label="Privacy Policy URL" value={settings.privacy_url ?? ""} onChange={(e) => upd("privacy_url", e.target.value)} placeholder="https://..." />
            <Textarea label="Footer Text" value={settings.footer_text ?? ""} onChange={(e) => upd("footer_text", e.target.value)} placeholder="© 2024 HX Academy..." rows={2} />
            <Button onClick={() => saveMutation.mutate(settings)} loading={saveMutation.isPending}><Save className="mr-2 h-4 w-4" />Save Legal Settings</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={methodModal} onOpenChange={setMethodModal}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{editMethod ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input label="Method Name *" value={methodForm.name} onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })} placeholder="e.g. CCP, BaridiMob" />
            <Textarea label="Instructions" value={methodForm.instructions} onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })} placeholder="How to pay using this method..." rows={3} />
            <Textarea label="Account Details" value={methodForm.accountDetails} onChange={(e) => setMethodForm({ ...methodForm, accountDetails: e.target.value })} placeholder="Account number, CCP number, etc." rows={2} />
            <div className="flex items-center gap-3">
              <Switch checked={methodForm.isActive} onCheckedChange={(v) => setMethodForm({ ...methodForm, isActive: v })} />
              <span className="text-sm">Active</span>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMethodModal(false)}>Cancel</Button>
            <Button onClick={() => saveMethodMutation.mutate()} loading={saveMethodMutation.isPending} disabled={!methodForm.name}>{editMethod ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteMethodId} onOpenChange={(o) => !o && setDeleteMethodId(null)} title="Delete Payment Method" description="Are you sure?" confirmLabel="Delete" onConfirm={() => deleteMethodId && deleteMethodMutation.mutate(deleteMethodId)} loading={deleteMethodMutation.isPending} />
    </div>
  );
}
