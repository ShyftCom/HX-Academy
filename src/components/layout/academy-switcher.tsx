"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Trophy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { readJsonOrThrow } from "@/lib/api-error";

interface Academy { id: string; slug: string; name: string }
interface AcademiesResponse { academies: Academy[]; active: Academy | null; needsChoice: boolean }

export function useAcademies() {
  return useQuery<AcademiesResponse>({
    queryKey: ["academies"],
    queryFn: () => fetch("/api/academies").then(readJsonOrThrow<AcademiesResponse>),
    staleTime: 5 * 60_000,
  });
}

/**
 * Switches academy and reloads. A full reload rather than a cache refresh:
 * every list, counter and open form on the page belongs to the academy being
 * left, and the selected station does too.
 */
async function switchAcademy(slug: string) {
  await fetch("/api/academies/active", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  }).then(readJsonOrThrow);
  try { localStorage.removeItem("active_station_id"); } catch { /* storage unavailable */ }
  window.location.assign("/dashboard");
}

/** Top-bar academy selector. Only shown to someone who can reach more than one academy. */
export function AcademySwitcher() {
  const { t } = useTranslation("common");
  const { data } = useAcademies();
  const [busy, setBusy] = useState(false);
  if (!data || data.academies.length < 2) return null;

  const choose = async (slug: string) => {
    if (slug === data.active?.slug) return;
    setBusy(true);
    try { await switchAcademy(slug); } catch { setBusy(false); toast.error(t("bo.academy.switch_failed")); }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={busy}
          aria-label={t("bo.academy.label")}
          className={cn(
            "flex h-9 max-w-[260px] items-center gap-2.5 rounded-[var(--ob-radius-control)]",
            "border border-[var(--ob-line-strong)] bg-[var(--ob-surface)] ps-2.5 pe-2 text-sm",
            "text-[var(--ob-text)] transition-colors hover:bg-[var(--ob-surface-high)]",
            "disabled:opacity-50"
          )}
        >
          <Trophy className="h-4 w-4 shrink-0 text-[var(--ob-accent)]" aria-hidden="true" />
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span className="ob-mono text-[10px] uppercase text-[var(--ob-text-muted)]">{t("bo.academy.label")}</span>
            <span className="max-w-[170px] truncate text-[13px] font-medium">{data.active?.name ?? "—"}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--ob-text-muted)]" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {data.academies.map((a) => (
          <DropdownMenuItem key={a.id} onClick={() => choose(a.slug)} className="gap-2.5">
            <Trophy className="h-4 w-4 shrink-0 text-[var(--ob-accent)]" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.name}</span>
            {a.id === data.active?.id && <Check className="h-4 w-4 shrink-0 text-[var(--ob-primary-light)]" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Start-of-day choice. Someone who can work in more than one academy is asked
 * which one before the back office opens; the choice lasts until midnight
 * (Algeria time), then they are asked again. Anyone with a single academy
 * never sees this.
 */
export function AcademyChoiceGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  const { data } = useAcademies();
  const [busy, setBusy] = useState<string | null>(null);
  if (!data?.needsChoice) return <>{children}</>;

  const choose = async (slug: string) => {
    setBusy(slug);
    try { await switchAcademy(slug); } catch { setBusy(null); toast.error(t("bo.academy.switch_failed")); }
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <Trophy className="mb-4 h-10 w-10 text-[var(--ob-accent)]" aria-hidden="true" />
      <h1 className="text-xl font-semibold">{t("bo.academy.choose_title")}</h1>
      <p className="mt-1 max-w-md text-sm text-[var(--ob-text-muted)]">{t("bo.academy.choose_body")}</p>
      <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        {data.academies.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={!!busy}
            onClick={() => choose(a.slug)}
            className={cn(
              "rounded-[var(--ob-radius-card,12px)] border border-[var(--ob-line-strong)] bg-[var(--ob-surface)] p-6 text-start",
              "transition-colors hover:border-[var(--ob-primary-light)] hover:bg-[var(--ob-surface-high)] disabled:opacity-60"
            )}
          >
            <Trophy className="mb-3 h-6 w-6 text-[var(--ob-accent)]" aria-hidden="true" />
            <p className="text-base font-semibold">{a.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
