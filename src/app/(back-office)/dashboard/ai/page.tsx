"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Bot, Check, Copy, KeyRound, Plus, Terminal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { formatDate, timeAgo } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

interface Connection extends Record<string, unknown> {
  id: string;
  name: string;
  kind: "oauth" | "token";
  readOnly: boolean;
  tokenPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  refreshExpiresAt: string | null;
  user: { id: string; name: string | null; email: string };
  client: { name: string } | null;
}

/** A value with a copy button — the connector URL, a command, a fresh token. */
function CopyField({ value, mono = true }: { value: string; mono?: boolean }) {
  const { t } = useTranslation("common");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-stretch gap-2">
      <code
        className={`min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-[var(--ob-radius-control)] border border-[var(--ob-line)] bg-[var(--ob-surface-high)] px-3 py-2 text-[12.5px] text-[var(--ob-text)] ${mono ? "font-mono" : ""}`}
      >
        {value}
      </code>
      <Button variant="outline" size="icon" onClick={copy} aria-label={t("bo.ai.copy")}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-[13px] text-[var(--ob-text-secondary)]">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--ob-primary-soft)] text-[11px] font-semibold text-[var(--ob-primary-light)]">
        {n}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

export default function AiConnectionsPage() {
  const { t } = useTranslation("common");
  const qc = useQueryClient();
  const [scopeAll, setScopeAll] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [tokenReadOnly, setTokenReadOnly] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const origin = useHydrated() ? window.location.origin : "";
  const mcpUrl = `${origin}/api/mcp`;

  const { data, isLoading } = useQuery<{ data: Connection[]; canManage: boolean; canConnect: boolean }>({
    queryKey: ["ai-connections", scopeAll],
    queryFn: async () => {
      const res = await fetch(`/api/ai-connections${scopeAll ? "?scope=all" : ""}`);
      if (!res.ok) throw new Error("load failed");
      return res.json();
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tokenName.trim(), readOnly: tokenReadOnly }),
      });
      if (!res.ok) throw new Error("create failed");
      return res.json() as Promise<{ token: string }>;
    },
    onSuccess: (r) => {
      setNewToken(r.token);
      qc.invalidateQueries({ queryKey: ["ai-connections"] });
    },
    onError: () => toast.error(t("bo.ai.create_failed")),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai-connections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("revoke failed");
    },
    onSuccess: () => {
      toast.success(t("bo.ai.revoked_toast"));
      setRevokeId(null);
      qc.invalidateQueries({ queryKey: ["ai-connections"] });
    },
    onError: () => toast.error(t("bo.ai.revoke_failed")),
  });

  const closeCreate = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setNewToken(null);
      setTokenName("");
      setTokenReadOnly(false);
    }
  };

  const rows = data?.data ?? [];
  const active = rows.filter((r) => !r.revokedAt).length;

  const columns = [
    {
      key: "name",
      header: t("bo.ai.col_connection"),
      cell: (r: Connection) => (
        <div className={r.revokedAt ? "opacity-50" : ""}>
          <div className="text-sm font-medium text-[var(--ob-text)]">{r.name}</div>
          <div className="font-mono text-[11px] text-[var(--ob-text-muted)]">{r.tokenPrefix}…</div>
        </div>
      ),
    },
    ...(scopeAll
      ? [
          {
            key: "user",
            header: t("bo.ai.col_user"),
            cell: (r: Connection) => <span className="text-sm">{r.user.name ?? r.user.email}</span>,
          },
        ]
      : []),
    {
      key: "kind",
      header: t("bo.ai.col_type"),
      cell: (r: Connection) =>
        r.kind === "oauth" ? (
          <Badge variant="default">{r.client?.name ?? "Claude"}</Badge>
        ) : (
          <Badge variant="secondary">{t("bo.ai.type_token")}</Badge>
        ),
    },
    {
      key: "access",
      header: t("bo.ai.col_access"),
      cell: (r: Connection) =>
        r.readOnly ? <Badge variant="outline">{t("bo.ai.read_only")}</Badge> : <Badge variant="warning">{t("bo.ai.full_access")}</Badge>,
    },
    {
      key: "lastUsed",
      header: t("bo.ai.col_last_used"),
      hideOnMobile: true,
      cell: (r: Connection) => <span className="text-xs text-[var(--ob-text-muted)]">{r.lastUsedAt ? timeAgo(r.lastUsedAt) : t("bo.ai.never")}</span>,
    },
    {
      key: "created",
      header: t("bo.ai.col_created"),
      hideOnMobile: true,
      cell: (r: Connection) => <span className="text-xs text-[var(--ob-text-muted)]">{formatDate(r.createdAt)}</span>,
    },
    {
      key: "status",
      header: t("bo.ai.col_status"),
      cell: (r: Connection) =>
        r.revokedAt ? (
          <Badge variant="destructive">{t("bo.ai.status_revoked")}</Badge>
        ) : (
          <Button variant="destructive" size="sm" onClick={() => setRevokeId(r.id)}>
            {t("bo.ai.revoke")}
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t("bo.ai.title")} description={t("bo.ai.subtitle")}>
        {data?.canConnect && (
          <Button onClick={() => setCreateOpen(true)}>
            <KeyRound className="me-1.5 h-4 w-4" />
            {t("bo.ai.create_token")}
          </Button>
        )}
      </PageHeader>

      {/* min-w-0: a grid item won't shrink below its widest line, and the
          one-line commands would otherwise push the cards off a phone screen. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[var(--ob-primary-light)]" />
              {t("bo.ai.claude_app_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="text-[12px] font-medium text-[var(--ob-text-muted)]">{t("bo.ai.connector_url")}</div>
              {origin && <CopyField value={mcpUrl} />}
            </div>
            <ol className="space-y-2.5">
              <Step n={1}>{t("bo.ai.app_step1")}</Step>
              <Step n={2}>{t("bo.ai.app_step2")}</Step>
              <Step n={3}>{t("bo.ai.app_step3")}</Step>
              <Step n={4}>{t("bo.ai.app_step4")}</Step>
            </ol>
            <p className="rounded-[var(--ob-radius-control)] bg-[var(--ob-primary-soft)] px-3 py-2 text-[12.5px] text-[var(--ob-primary-light)]">
              {t("bo.ai.unlimited_note")}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[var(--ob-primary-light)]" />
              {t("bo.ai.claude_code_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-2.5">
              <Step n={1}>
                <span className="mb-1.5 block">{t("bo.ai.code_step1")}</span>
                {origin && <CopyField value={`claude mcp add --transport http hx-academy ${mcpUrl}`} />}
              </Step>
              <Step n={2}>{t("bo.ai.code_step2")}</Step>
            </ol>
            <p className="text-[12.5px] text-[var(--ob-text-muted)]">{t("bo.ai.code_token_note")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>
            {t("bo.ai.connections_title")}
            {!isLoading && <span className="ms-2 text-[13px] font-normal text-[var(--ob-text-muted)]">{t("bo.ai.active_count", { n: active })}</span>}
          </CardTitle>
          {data?.canManage && (
            <label className="flex items-center gap-2 text-[13px] text-[var(--ob-text-secondary)]">
              <Switch checked={scopeAll} onCheckedChange={setScopeAll} />
              {t("bo.ai.show_all_users")}
            </label>
          )}
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            loading={isLoading}
            rowKey={(r) => r.id}
            emptyMessage={t("bo.ai.empty")}
            emptyDescription={t("bo.ai.empty_hint")}
            emptyIcon={<Bot className="h-8 w-8" />}
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={closeCreate}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{newToken ? t("bo.ai.token_created_title") : t("bo.ai.create_token")}</DialogTitle>
          </DialogHeader>
          {newToken ? (
            <DialogBody className="space-y-4">
              <p className="text-[13px] text-[var(--ob-warning)]">{t("bo.ai.token_once")}</p>
              <CopyField value={newToken} />
              <div className="space-y-1.5">
                <div className="text-[12px] font-medium text-[var(--ob-text-muted)]">{t("bo.ai.token_command")}</div>
                <CopyField value={`claude mcp add --transport http hx-academy ${mcpUrl} --header "Authorization: Bearer ${newToken}"`} />
              </div>
            </DialogBody>
          ) : (
            <DialogBody className="space-y-4">
              <Input
                label={t("bo.ai.connection_name")}
                value={tokenName}
                maxLength={120}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder={t("bo.ai.token_name_placeholder")}
                autoFocus
                required
              />
              <label className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-[13px] font-medium text-[var(--ob-text)]">{t("bo.ai.read_only")}</span>
                  <span className="block text-[12px] text-[var(--ob-text-muted)]">{t("bo.ai.read_only_hint")}</span>
                </span>
                <Switch checked={tokenReadOnly} onCheckedChange={setTokenReadOnly} aria-label={t("bo.ai.read_only")} />
              </label>
            </DialogBody>
          )}
          <DialogFooter>
            {newToken ? (
              <Button onClick={() => closeCreate(false)}>{t("bo.ai.done")}</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => closeCreate(false)}>
                  {t("actions.cancel")}
                </Button>
                <Button onClick={() => create.mutate()} disabled={!tokenName.trim()} loading={create.isPending}>
                  <Plus className="me-1.5 h-4 w-4" />
                  {t("bo.ai.create")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!revokeId}
        onOpenChange={(o) => !o && setRevokeId(null)}
        title={t("bo.ai.revoke_title")}
        description={t("bo.ai.revoke_description")}
        confirmLabel={t("bo.ai.revoke")}
        onConfirm={() => revokeId && revoke.mutate(revokeId)}
        loading={revoke.isPending}
      />
    </div>
  );
}
