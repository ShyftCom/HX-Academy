"use client";

/**
 * API Connectors — sitewide ad-platform tags.
 *
 * TikTok, Google Ads and Snapchat are configured here (AdConnector table,
 * /api/ad-connectors). Meta is shown for completeness but is read-only on this
 * page: it is still configured from Settings > Meta Pixel and nothing here can
 * change it.
 */

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, CircleDashed, ExternalLink, Save, Settings2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { FullPageLoader } from "@/components/shared/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useHydrated } from "@/hooks/use-hydrated";
import { PERMISSIONS } from "@/lib/permission-names";
import { formatDateTime } from "@/lib/utils";
import { LEAD_EVENTS, validateAdConnector, type AdProvider, type AdConnectorInput } from "@/lib/ad-tracking/config";
import { readAdDiagnostics } from "@/lib/ad-tracking/client";

interface Connector extends AdConnectorInput {
  provider: AdProvider;
  validationState: string;
  validationErrors: string[];
  updatedAt: string | null;
}

interface Payload {
  connectors: Connector[];
  meta: { enabled: boolean; configured: boolean };
}

const BRAND: Record<AdProvider | "meta", { logo: string; tile: string; fg: string; name: string }> = {
  meta: { logo: "meta", tile: "#ffffff", fg: "#0467DF", name: "Meta Ads Pixel" },
  tiktok: { logo: "tiktok", tile: "#000000", fg: "#ffffff", name: "TikTok Ads Pixel" },
  google_ads: { logo: "googleads", tile: "#ffffff", fg: "#4285F4", name: "Google Ads" },
  snapchat: { logo: "snapchat", tile: "#FFFC00", fg: "#000000", name: "Snapchat Ads Pixel" },
};

const ID_PLACEHOLDER: Record<AdProvider, string> = {
  tiktok: "C4ABCDEF12GHIJ345678",
  google_ads: "AW-123456789",
  snapchat: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
};

function Logo({ provider }: { provider: AdProvider | "meta" }) {
  const b = BRAND[provider];
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ob-radius-control)] border border-[var(--ob-line)]"
      style={{ background: b.tile }}
      aria-hidden
    >
      <span
        className="h-5 w-5"
        style={{
          background: b.fg,
          WebkitMask: `url(/images/connectors/${b.logo}.svg) center / contain no-repeat`,
          mask: `url(/images/connectors/${b.logo}.svg) center / contain no-repeat`,
        }}
      />
    </span>
  );
}

function Check({ ok, label, pending }: { ok: boolean; label: string; pending?: boolean }) {
  const Icon = pending ? CircleDashed : ok ? CheckCircle2 : XCircle;
  const color = pending ? "text-[var(--ob-text-muted)]" : ok ? "text-[var(--ob-success)]" : "text-[var(--ob-error)]";
  return (
    <li className="flex items-center gap-2 text-[12.5px] text-[var(--ob-text-secondary)]">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
      {label}
    </li>
  );
}

function StatusBadge({ c }: { c: Connector }) {
  const { t } = useTranslation("common");
  if (c.enabled) return <Badge variant="success">{t("bo.ad_connectors.status_active")}</Badge>;
  if (c.validationState === "invalid") return <Badge variant="destructive">{t("bo.ad_connectors.status_invalid")}</Badge>;
  if (c.validationState === "valid") return <Badge variant="secondary">{t("bo.ad_connectors.status_disabled")}</Badge>;
  return <Badge variant="outline">{t("bo.ad_connectors.status_not_configured")}</Badge>;
}

function ConnectorCard({ c, canEdit, onConfigure }: { c: Connector; canEdit: boolean; onConfigure: () => void }) {
  const { t } = useTranslation("common");
  const hydrated = useHydrated();
  // Browser-local results only count for the ID that is live now; anything
  // older (another ID, or from before the connector was switched off) is stale.
  const stored = hydrated && c.enabled ? readAdDiagnostics()[c.provider] : undefined;
  const local = stored?.trackingId === c.trackingId ? stored : undefined;
  const errors = validateAdConnector(c.provider, c);
  const [showGuide, setShowGuide] = useState(false);
  const p = `bo.ad_connectors.${c.provider}`;

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-start gap-3">
          <Logo provider={c.provider} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--ob-text)]">{BRAND[c.provider].name}</h3>
              <StatusBadge c={c} />
            </div>
            <p className="mt-1 text-[12.5px] text-[var(--ob-text-secondary)]">{t(`${p}.description`)}</p>
          </div>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px]">
          <dt className="text-[var(--ob-text-muted)]">{t(`${p}.id_label`)}</dt>
          <dd className="truncate font-mono text-[var(--ob-text)]">{c.trackingId || "—"}</dd>
          {c.provider === "google_ads" && (
            <>
              <dt className="text-[var(--ob-text-muted)]">{t("bo.ad_connectors.google_ads.label_label")}</dt>
              <dd className="truncate font-mono text-[var(--ob-text)]">{c.conversionLabel || "—"}</dd>
            </>
          )}
          <dt className="text-[var(--ob-text-muted)]">{t("bo.ad_connectors.lead_event")}</dt>
          <dd className="font-mono text-[var(--ob-text)]">{c.leadEvent}</dd>
          <dt className="text-[var(--ob-text-muted)]">{t("bo.ad_connectors.last_updated")}</dt>
          <dd className="text-[var(--ob-text)]">{c.updatedAt ? formatDateTime(c.updatedAt) : t("bo.ad_connectors.never_saved")}</dd>
        </dl>

        <div className="rounded-[var(--ob-radius-control)] border border-[var(--ob-line)] p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ob-text-muted)]">{t("bo.ad_connectors.diagnostics")}</p>
          <ul className="space-y-1">
            <Check ok={!!c.trackingId} label={t("bo.ad_connectors.check_id_configured")} />
            <Check ok={!errors.includes("tracking_id_invalid") && !!c.trackingId} label={t("bo.ad_connectors.check_id_valid")} />
            {c.provider === "google_ads" && (
              <Check ok={!errors.includes("label_missing") && !errors.includes("label_invalid")} label={t("bo.ad_connectors.check_label")} />
            )}
            <Check ok={c.enabled} label={t("bo.ad_connectors.check_enabled")} />
            <Check ok={c.enabled && c.trackLeads} label={t("bo.ad_connectors.check_leads")} />
            <Check
              ok={local?.scriptStatus === "loaded"}
              pending={!local || local.scriptStatus === "loading"}
              label={
                local?.scriptStatus
                  ? t(`bo.ad_connectors.script_${local.scriptStatus}`)
                  : t("bo.ad_connectors.script_unknown")
              }
            />
          </ul>
          {errors.length > 0 && c.trackingId && (
            <ul className="mt-2 space-y-0.5 text-[12px] text-[var(--ob-error)]">
              {errors.map((e) => <li key={e}>{t(`bo.ad_connectors.errors.${e}`)}</li>)}
            </ul>
          )}
          <p className="mt-2 text-[12px] text-[var(--ob-text-secondary)]">
            {local?.lastEvent
              ? t("bo.ad_connectors.last_local_event", {
                  name: local.lastEvent.name,
                  at: formatDateTime(local.lastEvent.at),
                })
              : t("bo.ad_connectors.no_local_event")}
          </p>
          <p className="mt-1 text-[11.5px] text-[var(--ob-text-muted)]">{t("bo.ad_connectors.local_vs_provider")}</p>
        </div>

        {showGuide && (
          <ol className="list-decimal space-y-1 ps-5 text-[12.5px] text-[var(--ob-text-secondary)]">
            {[1, 2, 3, 4].map((n) => <li key={n}>{t(`${p}.guide_${n}`)}</li>)}
          </ol>
        )}

        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button size="sm" onClick={onConfigure}>
              <Settings2 className="me-2 h-4 w-4" />
              {c.updatedAt ? t("bo.ad_connectors.edit") : t("bo.ad_connectors.configure")}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowGuide((v) => !v)}>
            {showGuide ? t("bo.ad_connectors.hide_guide") : t("bo.ad_connectors.test_guide")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaCard({ meta }: { meta: Payload["meta"] }) {
  const { t } = useTranslation("common");
  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-start gap-3">
          <Logo provider="meta" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--ob-text)]">{BRAND.meta.name}</h3>
              {meta.enabled && meta.configured ? (
                <Badge variant="success">{t("bo.ad_connectors.status_active")}</Badge>
              ) : (
                <Badge variant="secondary">{t("bo.ad_connectors.status_disabled")}</Badge>
              )}
            </div>
            <p className="mt-1 text-[12.5px] text-[var(--ob-text-secondary)]">{t("bo.ad_connectors.meta.description")}</p>
          </div>
        </div>
        <p className="text-[12.5px] text-[var(--ob-text-secondary)]">{t("bo.ad_connectors.meta.managed_elsewhere")}</p>
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/settings">
            <ExternalLink className="me-2 h-4 w-4" />
            {t("bo.ad_connectors.meta.open_settings")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ConfigureDialog({ c, onClose }: { c: Connector; onClose: () => void }) {
  const { t } = useTranslation("common");
  const qc = useQueryClient();
  const [form, setForm] = useState<AdConnectorInput>({
    enabled: c.enabled,
    trackingId: c.trackingId,
    conversionLabel: c.conversionLabel,
    leadEvent: c.leadEvent,
    trackPageViews: c.trackPageViews,
    trackLeads: c.trackLeads,
  });
  const set = <K extends keyof AdConnectorInput>(k: K, v: AdConnectorInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const errors = validateAdConnector(c.provider, form);
  const p = `bo.ad_connectors.${c.provider}`;
  const errFor = (...codes: string[]) => {
    const e = errors.find((x) => codes.includes(x));
    return e && (form.enabled || form.trackingId) ? t(`bo.ad_connectors.errors.${e}`) : undefined;
  };

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ad-connectors/${c.provider}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("save failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("bo.ad_connectors.saved"));
      qc.invalidateQueries({ queryKey: ["ad-connectors"] });
      onClose();
    },
    onError: () => toast.error(t("toast.save_failed")),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{BRAND[c.provider].name}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Input
            label={t(`${p}.id_label`)}
            value={form.trackingId}
            onChange={(e) => set("trackingId", e.target.value.trim())}
            placeholder={ID_PLACEHOLDER[c.provider]}
            hint={t(`${p}.id_hint`)}
            error={errFor("tracking_id_missing", "tracking_id_invalid")}
            autoComplete="off"
            spellCheck={false}
          />
          {c.provider === "google_ads" && (
            <Input
              label={t("bo.ad_connectors.google_ads.label_label")}
              value={form.conversionLabel}
              onChange={(e) => set("conversionLabel", e.target.value.trim())}
              placeholder="AbC-D_efG-h12_34-567"
              hint={t("bo.ad_connectors.google_ads.label_hint")}
              error={errFor("label_missing", "label_invalid")}
              autoComplete="off"
              spellCheck={false}
            />
          )}
          {LEAD_EVENTS[c.provider].length > 1 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("bo.ad_connectors.lead_event")}</label>
              <Select value={form.leadEvent} onValueChange={(v) => set("leadEvent", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_EVENTS[c.provider].map((ev) => <SelectItem key={ev} value={ev}>{ev}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-gray-500">{t(`${p}.lead_event_hint`)}</p>
            </div>
          )}
          {[
            ["enabled", "toggle_enabled"],
            ["trackPageViews", "toggle_page_views"],
            ["trackLeads", "toggle_leads"],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <Switch
                checked={form[key as "enabled"]}
                onCheckedChange={(v) => set(key as "enabled", v)}
              />
              <span className="text-sm">{t(`bo.ad_connectors.${label}`)}</span>
            </div>
          ))}
          {form.enabled && errors.length > 0 && (
            <p className="text-xs text-[var(--ob-error)]">{t("bo.ad_connectors.fix_before_enable")}</p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("ui.cancel")}</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={form.enabled && errors.length > 0}>
            <Save className="me-2 h-4 w-4" />
            {t("bo.save_settings")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ApiConnectorsPage() {
  const { t } = useTranslation("common");
  const { can } = usePermissions();
  const canEdit = can(PERMISSIONS.SETTINGS_EDIT);
  const [editing, setEditing] = useState<AdProvider | null>(null);

  const { data, isLoading } = useQuery<Payload>({
    queryKey: ["ad-connectors"],
    queryFn: async () => {
      const res = await fetch("/api/ad-connectors");
      if (!res.ok) throw new Error("load failed");
      return res.json();
    },
  });

  if (isLoading || !data) return <FullPageLoader />;
  const editingConnector = data.connectors.find((c) => c.provider === editing);

  return (
    <div className="space-y-5">
      <PageHeader title={t("bo.ad_connectors.title")} description={t("bo.ad_connectors.subtitle")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <MetaCard meta={data.meta} />
        {data.connectors.map((c) => (
          <ConnectorCard key={c.provider} c={c} canEdit={canEdit} onConfigure={() => setEditing(c.provider)} />
        ))}
      </div>
      <p className="text-[12px] text-[var(--ob-text-muted)]">{t("bo.ad_connectors.consent_note")}</p>
      {editingConnector && <ConfigureDialog key={editingConnector.provider} c={editingConnector} onClose={() => setEditing(null)} />}
    </div>
  );
}
