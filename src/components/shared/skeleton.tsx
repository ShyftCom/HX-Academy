import { cn } from "@/lib/utils";

/**
 * Loading placeholder. `.ob-skeleton` carries the shimmer and honours
 * prefers-reduced-motion (globals.css) — never animate a skeleton by hand.
 *
 * Skeletons should mirror the shape of the content they stand in for. A
 * generic spinner tells the user "wait"; a skeleton tells them what is coming
 * and stops the layout jumping when it lands.
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={cn("ob-skeleton", className)} style={style} aria-hidden="true" />;
}

/** Matches MetricCard's footprint so the grid doesn't reflow on load. */
export function MetricCardSkeleton() {
  return (
    <div className="rounded-[var(--ob-radius-container)] border border-[var(--ob-line)] bg-[var(--ob-surface-low)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-9 w-9 rounded-[var(--ob-radius-control)]" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="flex flex-col justify-end gap-2" style={{ height }}>
      {/* Staggered bar heights read as a chart rather than as a grey block. */}
      <div className="flex flex-1 items-end gap-2">
        {[45, 70, 35, 85, 55, 95, 60, 40, 75, 50, 88, 65].map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-[var(--ob-radius-container)] border border-[var(--ob-line)]">
      <div className="flex gap-4 border-b border-[var(--ob-line)] bg-[var(--ob-surface)] px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-[var(--ob-line-faint)] px-4 py-3.5 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
