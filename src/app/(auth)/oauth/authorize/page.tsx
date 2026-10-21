"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { Bot, Eye, ShieldCheck } from "lucide-react";
import { AuthCard } from "@/components/shared/auth-card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

/**
 * OAuth consent screen for Claude (the MCP authorization_endpoint).
 *
 * Claude sends the browser here when someone adds HX Academy as a connector.
 * The staff member signs in with their normal back-office account, names the
 * connection, optionally limits it to read-only, and approves — after which
 * Claude acts as them, with their permissions. Nothing is shown before the
 * session has loaded, which also keeps translated text out of the server
 * render (the French-default hydration trap).
 */
export default function AuthorizePage() {
  return (
    <Suspense fallback={<Centered />}>
      <Consent />
    </Suspense>
  );
}

function Centered() {
  return (
    <div className="flex justify-center py-16">
      <LoadingSpinner />
    </div>
  );
}

type Load =
  | { state: "loading" }
  | { state: "ready"; clientName: string; redirectHost: string }
  | { state: "error"; reason: "forbidden" | "invalid" };

function Consent() {
  const { t } = useTranslation("common");
  const sp = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [name, setName] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [submitting, setSubmitting] = useState<"approve" | "deny" | null>(null);

  const clientId = sp.get("client_id");
  const redirectUri = sp.get("redirect_uri");
  const malformed = sp.get("response_type") !== "code" || !clientId || !redirectUri;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || malformed) return;
    const q = new URLSearchParams({ client_id: clientId!, redirect_uri: redirectUri! });
    fetch(`/api/oauth/authorize?${q}`).then(async (res) => {
      if (res.status === 403) return setLoad({ state: "error", reason: "forbidden" });
      if (!res.ok) return setLoad({ state: "error", reason: "invalid" });
      const data = await res.json();
      setLoad({ state: "ready", ...data });
      setName(`${data.clientName} — ${session?.user?.name ?? session?.user?.email ?? ""}`.slice(0, 120));
    });
  }, [status, malformed, clientId, redirectUri, session?.user?.name, session?.user?.email]);

  const decide = async (approve: boolean) => {
    setSubmitting(approve ? "approve" : "deny");
    const res = await fetch("/api/oauth/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        redirect_uri: redirectUri,
        state: sp.get("state") ?? undefined,
        code_challenge: sp.get("code_challenge") ?? undefined,
        code_challenge_method: sp.get("code_challenge_method") ?? undefined,
        approve,
        name: name.trim() || undefined,
        readOnly,
      }),
    });
    if (!res.ok) {
      setSubmitting(null);
      return setLoad({ state: "error", reason: res.status === 403 ? "forbidden" : "invalid" });
    }
    const { redirect } = await res.json();
    window.location.assign(redirect);
  };

  if (status !== "authenticated") return <Centered />;
  const shown: Load = malformed ? { state: "error", reason: "invalid" } : load;
  if (shown.state === "loading") return <Centered />;

  if (shown.state === "error") {
    return (
      <AuthCard
        title={t("bo.ai.consent.error_title")}
        description={shown.reason === "forbidden" ? t("bo.ai.consent.forbidden") : t("bo.ai.consent.invalid")}
      >
        <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
          {t("bo.ai.consent.back_to_dashboard")}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("bo.ai.consent.title", { client: shown.clientName })}
      description={t("bo.ai.consent.subtitle")}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-[var(--ob-radius-control)] border border-[var(--ob-line)] bg-[var(--ob-surface-high)] p-3 text-[13px]">
          <Bot className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ob-primary-light)]" />
          <div className="space-y-1">
            <p className="text-[var(--ob-text)]">
              {t("bo.ai.consent.acting_as", { name: session?.user?.name ?? session?.user?.email })}
            </p>
            <p className="text-[var(--ob-text-muted)]">{t("bo.ai.consent.redirect_to", { host: shown.redirectHost })}</p>
          </div>
        </div>

        <Input
          label={t("bo.ai.connection_name")}
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          hint={t("bo.ai.connection_name_hint")}
        />

        <label className="flex items-start justify-between gap-3 rounded-[var(--ob-radius-control)] border border-[var(--ob-line)] p-3">
          <span className="flex items-start gap-2.5">
            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ob-text-muted)]" />
            <span>
              <span className="block text-[13px] font-medium text-[var(--ob-text)]">{t("bo.ai.read_only")}</span>
              <span className="block text-[12px] text-[var(--ob-text-muted)]">{t("bo.ai.read_only_hint")}</span>
            </span>
          </span>
          <Switch checked={readOnly} onCheckedChange={setReadOnly} aria-label={t("bo.ai.read_only")} />
        </label>

        <p className="flex items-start gap-2 text-[12px] text-[var(--ob-text-muted)]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {readOnly ? t("bo.ai.consent.scope_read") : t("bo.ai.consent.scope_full")}
        </p>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => decide(false)} loading={submitting === "deny"} disabled={!!submitting}>
            {t("bo.ai.consent.deny")}
          </Button>
          <Button className="flex-1" onClick={() => decide(true)} loading={submitting === "approve"} disabled={!!submitting}>
            {t("bo.ai.consent.approve")}
          </Button>
        </div>

        <button
          type="button"
          className="text-center text-[12px] text-[var(--ob-primary-light)] hover:underline"
          onClick={() =>
            signOut({ callbackUrl: `/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}` })
          }
        >
          {t("bo.ai.consent.switch_account")}
        </button>
      </div>
    </AuthCard>
  );
}
