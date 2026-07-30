"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { direction } from "@/lib/format";
import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react";

export interface MetricTrend {
  /** Percentage change. Positive = up, negative = down, 0 = flat. */
  value: number;
  /** Already-translated caption, e.g. "vs last month". */
  label: string;
  /**
   * Set when a rise is bad — churn, refunds, outstanding balances. Without
   * this a growing "Pending payments" figure would render as a win.
   */
  inverted?: boolean;
}

interface MetricCardProps {
  /** Already-translated. */
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: MetricTrend;
  /** Turns the whole card into a link to the underlying records. */
  href?: string;
  featured?: boolean;
  className?: string;
}

/**
 * The one metric tile used across every dashboard.
 *
 * Replaces the previous StatCard, whose caller had to pass `iconColor` and
 * `iconBg` per instance — which is exactly how the old dashboard ended up with
 * six unrelated hues in one row. The icon here is always a neutral chip; the
 * only colour on the card is the trend, where colour actually carries meaning.
 */
export function MetricCard({
  title, value, subtitle, icon: Icon, trend, href, featured, className,
}: MetricCardProps) {
  const dir = trend ? direction(trend.value) : "flat";
  // "Good" is not "up" — an inverted metric flips which direction is positive.
  const good = trend?.inverted ? dir === "down" : dir === "up";

  const trendColor =
    dir === "flat"
      ? "text-[var(--ob-text-muted)]"
      : good
        ? "text-[var(--ob-success)]"
        : "text-[var(--ob-error)]";

  const TrendIcon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : ArrowRight;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Wraps to a second line rather than truncating. French and Arabic
              labels ("Abonnements actifs", "Paiements en attente") are much
              longer than the English ones and were clipping to
              "ABONNEMENTS ACTIF…" in a 4-up grid. leading-[1.4] because
              .ob-mono sets line-height:1, which collides when it wraps. */}
          <p className="ob-mono uppercase leading-[1.4] text-[var(--ob-text-muted)]">{title}</p>
          <p className="mt-2 truncate text-[26px] font-semibold leading-none tracking-[-0.02em] text-[var(--ob-text)]">
            {value}
          </p>
          {subtitle && (
            <p className="mt-2 truncate text-[13px] text-[var(--ob-text-muted)]">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ob-radius-control)] border border-[var(--ob-line)] bg-[var(--ob-surface)] text-[var(--ob-text-secondary)]"
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {/* Arrow + sign + colour: three independent signals for one meaning,
              so the delta still reads without colour perception. */}
          <span className={cn("inline-flex items-center gap-0.5 font-medium", trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-mono tabular-nums">
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
          </span>
          <span className="truncate text-[var(--ob-text-muted)]">{trend.label}</span>
        </div>
      )}
    </>
  );

  const shell = cn(
    "block rounded-[var(--ob-radius-container)] border border-[var(--ob-line)] p-5",
    featured
      ? "bg-[linear-gradient(135deg,var(--ob-surface-low)_0%,var(--ob-surface-high)_100%)]"
      : "bg-[var(--ob-surface-low)]",
    href &&
      "transition-colors hover:border-[var(--ob-line-strong)] hover:bg-[var(--ob-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ob-primary)]",
    className
  );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}
