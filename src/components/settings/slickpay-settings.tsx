"use client";

/**
 * Super Admin panel for the SlickPay gateway.
 *
 * Reads and writes /api/settings/slickpay rather than the generic settings
 * endpoint, because the API key and webhook secret are credentials: they are
 * write-only from the browser's point of view. The form never receives either
 * value — it gets a `hasPublicKey` flag and the key's last four characters, so
 * an admin can confirm *which* key is installed without it being readable by
 * anyone who opens devtools.
 *
 * Consequence: an empty API key field means "keep the saved key", never "clear
 * the key". Clearing is done by switching the gateway off.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Copy, RefreshCw, Plug, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SlickPaySettings {
  enabled: boolean;
  mode: "sandbox" | "production";
  accountUuid: string;
  hasPublicKey: boolean;
  publicKeyHint: string;
  hasWebhookSecret: boolean;
  webhookUrl: string;
}

export function SlickPaySettings() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();

  // Only the admin's *unsaved edits* live in state; anything untouched reads
  // straight from the fetched settings. That avoids copying server data into
  // state with an effect, which cascades a second render on every refetch and
  // would clobber a field being typed into when the query revalidates.
  const [edits, setEdits] = useState<Partial<Omit<SlickPaySettings, "hasPublicKey" | "publicKeyHint" | "hasWebhookSecret" | "webhookUrl">>>({});
  const [publicKey, setPublicKey] = useState("");

  const { data, isLoading } = useQuery<SlickPaySettings>({
    queryKey: ["slickpay-settings"],
    queryFn: () => fetch("/api/settings/slickpay").then((r) => r.json()),
  });

  const enabled = edits.enabled ?? data?.enabled ?? false;
  const mode = edits.mode ?? data?.mode ?? "sandbox";
  const accountUuid = edits.accountUuid ?? data?.accountUuid ?? "";

  const setEnabled = (v: boolean) => setEdits((e) => ({ ...e, enabled: v }));
  const setMode = (v: "sandbox" | "production") => setEdits((e) => ({ ...e, mode: v }));
  const setAccountUuid = (v: string) => setEdits((e) => ({ ...e, accountUuid: v }));

  const saveMutation = useMutation({
    mutationFn: async (extra: Record<string, unknown> = {}) => {
      const res = await fetch("/api/settings/slickpay", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, mode, accountUuid, publicKey, ...extra }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("settings.slickpay.saved"));
      // Drop the typed key from memory as soon as it is stored server-side,
      // and drop the local edits so the form reflects what the server now has.
      setPublicKey("");
      setEdits({});
      qc.invalidateQueries({ queryKey: ["slickpay-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings/slickpay/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Test the key currently in the field if there is one, so a bad paste
        // is caught before it is saved.
        body: JSON.stringify({ publicKey, mode }),
      });
      return res.json();
    },
    onSuccess: (r) => {
      if (r.ok) toast.success(t("settings.slickpay.test_ok", { mode: r.mode }));
      else toast.error(t("settings.slickpay.test_failed", { error: r.error }));
    },
    onError: () => toast.error(t("settings.slickpay.test_failed", { error: "network" })),
  });

  const copyWebhook = () => {
    if (!data?.webhookUrl) return;
    navigator.clipboard.writeText(data.webhookUrl);
    toast.success(t("settings.slickpay.copied"));
  };

  if (isLoading) {
    return <Card><CardContent className="pt-5 text-sm text-gray-500">…</CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="pt-5 space-y-5 max-w-2xl">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("settings.slickpay.heading")}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("settings.slickpay.intro")}
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <div>
            <p className="text-sm font-medium">{t("settings.slickpay.enabled")}</p>
            <p className="text-xs text-gray-500">{t("settings.slickpay.enabled_hint")}</p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("settings.slickpay.mode")}
          </label>
          <Select value={mode} onValueChange={(v) => setMode(v as "sandbox" | "production")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">{t("settings.slickpay.mode_sandbox")}</SelectItem>
              <SelectItem value="production">{t("settings.slickpay.mode_production")}</SelectItem>
            </SelectContent>
          </Select>
          {mode === "production" && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t("settings.slickpay.production_warning")}
            </p>
          )}
        </div>

        <div>
          <Input
            label={t("settings.slickpay.api_key")}
            type="password"
            autoComplete="off"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder={t("settings.slickpay.api_key_ph")}
          />
          <p className="mt-1 text-xs text-gray-500">
            {data?.hasPublicKey
              ? t("settings.slickpay.api_key_set", { hint: data.publicKeyHint })
              : t("settings.slickpay.api_key_missing")}
          </p>
        </div>

        <div>
          <Input
            label={t("settings.slickpay.account_uuid")}
            value={accountUuid}
            onChange={(e) => setAccountUuid(e.target.value)}
            placeholder="37990d08-fc51-4c32-ad40-1552d13c00d1"
          />
          <p className="mt-1 text-xs text-gray-500">{t("settings.slickpay.account_uuid_hint")}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("settings.slickpay.webhook_url")}
          </label>
          <div className="flex items-center gap-2">
            <Input readOnly value={data?.webhookUrl ?? ""} className="flex-1 font-mono text-xs" />
            <Button type="button" variant="outline" size="sm" onClick={copyWebhook}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="mt-1 text-xs text-gray-500">{t("settings.slickpay.webhook_url_hint")}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <p className="text-sm font-medium">{t("settings.slickpay.webhook_secret")}</p>
          {data?.hasWebhookSecret && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("settings.slickpay.webhook_secret_set")}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">{t("settings.slickpay.regenerate_warning")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate({ regenerateWebhookSecret: true })}
          >
            <RefreshCw className="me-1.5 h-3.5 w-3.5" />
            {t("settings.slickpay.regenerate_secret")}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => saveMutation.mutate({})} loading={saveMutation.isPending}>
            <Save className="me-2 h-4 w-4" />
            {t("settings.slickpay.save")}
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            loading={testMutation.isPending}
            disabled={!publicKey && !data?.hasPublicKey}
          >
            <Plug className="me-2 h-4 w-4" />
            {t("settings.slickpay.test")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
