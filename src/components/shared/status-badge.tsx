"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

/**
 * Maps the status strings the API actually returns onto a tone.
 *
 * Matching is case-insensitive and covers the French spellings too, because
 * different modules persist status in different languages (LeadStatus rows are
 * admin-authored, OrderStatus is seeded in English). Anything unrecognised
 * falls through to `neutral` — an unknown status must still render, just
 * without implying a judgement about it.
 */
const TONE_BY_STATUS: Record<string, StatusTone> = {
  active: "success", actif: "success", approved: "success", approuvé: "success",
  paid: "success", payé: "success", completed: "success", terminé: "success",
  published: "success", converted: "success", converti: "success", delivered: "success",
  confirmed: "success", validated: "success", resolved: "success",

  pending: "warning", "en attente": "warning", processing: "warning",
  "en cours": "warning", draft: "warning", brouillon: "warning",
  scheduled: "warning", partial: "warning", open: "warning", unpaid: "warning",

  rejected: "danger", rejeté: "danger", expired: "danger", expiré: "danger",
  cancelled: "danger", canceled: "danger", annulé: "danger", failed: "danger",
  suspended: "danger", overdue: "danger", refunded: "danger", lost: "danger",

  new: "info", nouveau: "info", contacted: "info", contacté: "info",
  trial: "info", assigned: "info", shipped: "info",

  inactive: "neutral", inactif: "neutral", archived: "neutral", closed: "neutral",
  paused: "neutral", "no show": "neutral",
};

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-[var(--ob-line-strong)] bg-[var(--ob-neutral-soft)] text-[var(--ob-text-secondary)]",
  info: "border-[rgba(0,112,243,0.3)] bg-[var(--ob-primary-soft)] text-[var(--ob-primary-light)]",
  success: "border-[rgba(60,215,255,0.3)] bg-[var(--ob-success-soft)] text-[var(--ob-success)]",
  warning: "border-[rgba(245,181,68,0.3)] bg-[var(--ob-warning-soft)] text-[var(--ob-warning)]",
  danger: "border-[rgba(255,180,171,0.3)] bg-[var(--ob-error-soft)] text-[var(--ob-error)]",
};

/** Distinct dot shape per tone, so state survives greyscale and colour blindness. */
const TONE_DOT: Record<StatusTone, string> = {
  neutral: "bg-[var(--ob-text-muted)]",
  info: "bg-[var(--ob-primary)]",
  success: "bg-[var(--ob-success)]",
  warning: "bg-[var(--ob-warning)]",
  danger: "bg-[var(--ob-error)]",
};

export function toneForStatus(status?: string | null): StatusTone {
  if (!status) return "neutral";
  return TONE_BY_STATUS[status.toLowerCase().trim()] ?? "neutral";
}

interface StatusBadgeProps {
  /** Raw status from the API. Used for tone lookup and, if no label, display. */
  status?: string | null;
  /** Overrides the visible text — pass a translated label here. */
  label?: string;
  /** Force a tone instead of deriving it from `status`. */
  tone?: StatusTone;
  className?: string;
}

/**
 * The single way a status is shown across the platform.
 *
 * JetBrains Mono, uppercase, tinted low-opacity fill — and always paired with
 * the label text plus a dot, never colour alone. A red pill that only reads as
 * "bad" to someone who can distinguish red is not an accessible status.
 */
export function StatusBadge({ status, label, tone, className }: StatusBadgeProps) {
  const { t } = useTranslation("common");
  const resolved = tone ?? toneForStatus(status);
  const key = status?.toLowerCase().trim().replace(/\s+/g, "_");

  // Prefer a translated status label; fall back to the raw value so an
  // admin-authored LeadStatus name still renders as authored.
  const text =
    label ??
    (key && t(`status.${key}`, { defaultValue: "" })) ??
    status ??
    "—";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5",
        "font-mono text-[11px] font-medium uppercase leading-[1.4] tracking-[0.04em]",
        TONE_CLASS[resolved],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[resolved])} aria-hidden="true" />
      {text || status}
    </span>
  );
}
