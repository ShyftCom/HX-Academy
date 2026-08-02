"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { chartTheme } from "@/lib/design-tokens";
import { ChartSkeleton } from "@/components/shared/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface ChartCardProps {
  title: string;
  description?: string;
  /** Toolbar slot — range pickers, station filters, export. */
  actions?: React.ReactNode;
  loading?: boolean;
  /** Renders the empty state instead of the chart when there's nothing to plot. */
  isEmpty?: boolean;
  emptyMessage?: string;
  height?: number;
  /**
   * Plain-language description of what the chart shows, for screen readers.
   * An SVG chart is opaque to assistive tech; without this the user gets a
   * card title and nothing else.
   */
  summary?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title, description, actions, loading, isEmpty, emptyMessage,
  height = 260, summary, children, className,
}: ChartCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </CardHeader>

      <CardContent className="flex-1 pt-4">
        {loading ? (
          <ChartSkeleton height={height} />
        ) : isEmpty ? (
          <div
            className="flex flex-col items-center justify-center gap-2 text-center"
            style={{ height }}
          >
            <BarChart3 className="h-6 w-6 text-[var(--ob-text-muted)] opacity-50" aria-hidden="true" />
            <p className="text-[13px] text-[var(--ob-text-muted)]">{emptyMessage ?? "No data"}</p>
          </div>
        ) : (
          <>
            {summary && <p className="sr-only">{summary}</p>}
            <div style={{ height }} aria-hidden={summary ? true : undefined}>
              {children}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Recharts <Tooltip content> for the Obsidian palette.
 *
 * Recharts' default tooltip is a white box with a black border — unreadable on
 * a charcoal surface. This matches the Level 2 glass treatment and routes
 * values through the caller's formatter so a chart and a table can't disagree
 * about what "3000" means.
 */
export function ChartTooltip({
  active, payload, label, formatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string }>;
  label?: string | number;
  formatter?: (value: number | string, name?: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="ob-glass rounded-[var(--ob-radius-control)] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      {label !== undefined && (
        <p className="ob-mono mb-1.5 uppercase text-[var(--ob-text-muted)]">{label}</p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-[13px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: entry.color ?? chartTheme.axis }}
              aria-hidden="true"
            />
            {entry.name && <span className="text-[var(--ob-text-muted)]">{entry.name}</span>}
            <span className="ms-auto font-mono tabular-nums font-medium text-[var(--ob-text)]">
              {formatter && entry.value !== undefined
                ? formatter(entry.value, entry.name)
                : String(entry.value ?? "—")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Shared axis props — spread onto <XAxis>/<YAxis> so every chart matches. */
export const axisProps = {
  tick: { fill: chartTheme.axis, fontSize: chartTheme.tickFontSize },
  tickLine: false,
  axisLine: { stroke: chartTheme.axisLine },
} as const;

/** Shared <CartesianGrid> props — horizontal only, barely-there stroke. */
export const gridProps = {
  stroke: chartTheme.grid,
  strokeDasharray: "3 3",
  vertical: false,
} as const;
