"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle, Inbox, LockKeyhole, RefreshCw, SearchX, WifiOff, type LucideIcon,
} from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  /** A secondary, lower-emphasis action beside the primary one. */
  secondaryAction?: { label: string; onClick: () => void };
  /** `compact` fits inside a card; `default` owns the page area. */
  size?: "default" | "compact";
  className?: string;
}

/**
 * The one empty state.
 *
 * An empty state should say what is missing and offer the next step — a bare
 * "No data" leaves the user guessing whether the page is broken, still
 * loading, or genuinely empty.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  size = "default",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "compact" ? "py-10" : "py-16",
        className
      )}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--ob-radius-container)] border border-[var(--ob-line)] bg-[var(--ob-surface)]"
        aria-hidden="true"
      >
        <Icon className="h-5 w-5 text-[var(--ob-text-muted)]" />
      </div>

      <h3 className="text-[15px] font-semibold text-[var(--ob-text)]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-[var(--ob-text-muted)]">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && <Button onClick={action.onClick}>{action.label}</Button>}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Nothing matched the active search/filters — distinct from "nothing exists". */
export function NoResultsState({ onClear }: { onClear?: () => void }) {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={SearchX}
      title={t("empty.no_results")}
      description={t("filters.clear")}
      action={onClear ? { label: t("filters.clear"), onClick: onClear } : undefined}
      size="compact"
    />
  );
}

/**
 * The user reached a page their role cannot open.
 *
 * Presentation only — the server already refused, or would refuse. This just
 * explains the refusal instead of showing a blank screen.
 */
export function NoPermissionState() {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={LockKeyhole}
      title={t("shell.no_permission_title")}
      description={t("shell.no_permission_body")}
    />
  );
}

export function NotFoundState() {
  const { t } = useTranslation("common");
  return (
    <EmptyState icon={SearchX} title={t("shell.not_found_title")} description={t("shell.not_found_body")} />
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={WifiOff}
      title={t("shell.offline_title")}
      description={t("shell.offline_body")}
      action={onRetry ? { label: t("shell.retry"), onClick: onRetry } : undefined}
    />
  );
}

/** A request failed. Always offers a retry — a dead end is not an error state. */
export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={AlertTriangle}
      title={t("shell.error_title")}
      // Deliberately generic by default: raw exception text leaks stack traces
      // and connection strings to whoever is looking at the screen.
      description={message ?? t("shell.error_body")}
      action={onRetry ? { label: t("shell.retry"), onClick: onRetry } : undefined}
    />
  );
}

export { RefreshCw };
