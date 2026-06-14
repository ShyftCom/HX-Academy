"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";

function LangTabs({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  return (
    <div className="flex gap-1 mb-2">
      {["en", "fr", "ar"].map((l) => (
        <button key={l} onClick={() => setLang(l)}
          className={`px-3 py-1 text-xs rounded font-medium transition-colors ${lang === l ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function StoreSettingsPage() {
  const qc = useQueryClient();
  const [lang, setLang] = useState("en");
  const [form, setForm] = useState({
    store_enabled: "true",
    store_title: "Our Store",
    store_title_fr: "Notre Boutique",
    store_title_ar: "متجرنا",
    store_description: "",
    store_description_fr: "",
    store_description_ar: "",
    store_shipping_fee: "500",
    store_free_shipping_threshold: "5000",
    store_low_stock_threshold: "5",
    store_order_email_template: "Thank you for your order {order_number}. Our team will contact you within 24 hours.",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => fetch("/api/website/store").then((r) => r.json()),
  });

  useEffect(() => {
    if (data) setForm((prev) => ({ ...prev, ...data }));
  }, [data]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      fetch("/api/website/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((r) => r.json()),
    onSuccess: () => { toast.success("Store settings saved!"); qc.invalidateQueries({ queryKey: ["store-settings"] }); },
    onError: () => toast.error("Failed to save"),
  });

  if (isLoading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <PageHeader title="Store Settings" description="Configure your public store." />

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Switch
            checked={form.store_enabled === "true"}
            onCheckedChange={(v) => setForm((p) => ({ ...p, store_enabled: v ? "true" : "false" }))}
          />
          <div>
            <p className="text-sm font-medium">Enable Store</p>
            <p className="text-xs text-gray-500">When disabled, the /store page returns 404.</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Store Page Title</label>
          <LangTabs lang={lang} setLang={setLang} />
          {lang === "en" && <Input value={form.store_title} onChange={(e) => setForm((p) => ({ ...p, store_title: e.target.value }))} />}
          {lang === "fr" && <Input value={form.store_title_fr} onChange={(e) => setForm((p) => ({ ...p, store_title_fr: e.target.value }))} />}
          {lang === "ar" && <Input value={form.store_title_ar} onChange={(e) => setForm((p) => ({ ...p, store_title_ar: e.target.value }))} dir="rtl" />}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Store Description</label>
          <LangTabs lang={lang} setLang={setLang} />
          {lang === "en" && <Textarea value={form.store_description} onChange={(e) => setForm((p) => ({ ...p, store_description: e.target.value }))} rows={2} />}
          {lang === "fr" && <Textarea value={form.store_description_fr} onChange={(e) => setForm((p) => ({ ...p, store_description_fr: e.target.value }))} rows={2} />}
          {lang === "ar" && <Textarea value={form.store_description_ar} onChange={(e) => setForm((p) => ({ ...p, store_description_ar: e.target.value }))} rows={2} dir="rtl" />}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Shipping Fee (DA)</label>
            <Input type="number" value={form.store_shipping_fee} onChange={(e) => setForm((p) => ({ ...p, store_shipping_fee: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Free Shipping Above (DA)</label>
            <p className="text-xs text-gray-400 mb-1">Set 0 to always charge</p>
            <Input type="number" value={form.store_free_shipping_threshold} onChange={(e) => setForm((p) => ({ ...p, store_free_shipping_threshold: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Low Stock Threshold</label>
            <Input type="number" value={form.store_low_stock_threshold} onChange={(e) => setForm((p) => ({ ...p, store_low_stock_threshold: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Order Confirmation Email Template</label>
          <p className="text-xs text-gray-400 mb-2">Use {"{order_number}"}, {"{customer_name}"}, {"{total}"} as placeholders.</p>
          <Textarea value={form.store_order_email_template} onChange={(e) => setForm((p) => ({ ...p, store_order_email_template: e.target.value }))} rows={4} />
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => save()} disabled={isPending} className="min-w-32">
          {isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
