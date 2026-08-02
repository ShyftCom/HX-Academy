"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/shared/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Inbox } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  /**
   * Right-align and use tabular figures. Set it on money, counts and
   * percentages so the column lines up on the decimal.
   */
  numeric?: boolean;
  /**
   * Hide below `md`. Use it for columns that are context rather than identity,
   * so the mobile table stays readable instead of scrolling sideways forever.
   */
  hideOnMobile?: boolean;
  /** Label shown for this field in the mobile card view. Defaults to `header`. */
  mobileLabel?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  /** Stable row key. Falls back to index, which is fine for a paged list. */
  rowKey?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  /** Header sticks to the top of the scroll container on long tables. */
  stickyHeader?: boolean;
  className?: string;
}

/**
 * The shared table.
 *
 * Desktop is a real <table> — semantics matter for screen readers and for
 * copy/paste into a spreadsheet. Below `md` the same data re-renders as
 * stacked label/value cards, because a 7-column table on a 375px viewport is
 * either unreadably compressed or scrolled so far that the row actions sit
 * outside the viewport.
 */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  emptyMessage = "No data found",
  emptyDescription,
  emptyIcon,
  rowKey,
  onRowClick,
  stickyHeader = true,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={6} columns={Math.min(columns.length, 6)} />;
  }

  if (data.length === 0) {
    return (
      <div className={cn("rounded-[var(--ob-radius-container)] border border-[var(--ob-line)] bg-[var(--ob-surface-low)]", className)}>
        <EmptyState
          icon={emptyIcon ? undefined : Inbox}
          title={emptyMessage}
          description={emptyDescription}
        />
      </div>
    );
  }

  const key = (row: T, i: number) => rowKey?.(row, i) ?? String(i);
  const mobileColumns = columns.filter((c) => !c.hideOnMobile);

  return (
    <div className={className}>
      {/* ---- Desktop / tablet ---- */}
      <div className="hidden overflow-x-auto rounded-[var(--ob-radius-container)] border border-[var(--ob-line)] bg-[var(--ob-surface-low)] md:block">
        <table className="w-full text-sm">
          <thead className={cn(stickyHeader && "sticky top-0 z-10")}>
            <tr className="border-b border-[var(--ob-line)] bg-[var(--ob-surface)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 font-medium",
                    col.numeric ? "text-end" : "text-start",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={key(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-[var(--ob-line-faint)] transition-colors last:border-0",
                  "hover:bg-[rgba(229,226,225,0.03)]",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-[var(--ob-text-secondary)]",
                      col.numeric && "text-end font-mono tabular-nums text-[var(--ob-text)]",
                      col.className
                    )}
                  >
                    {col.cell ? col.cell(row) : renderValue(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Mobile: one card per row ---- */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {data.map((row, i) => (
          <div
            key={key(row, i)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={
              onRowClick
                ? (e) => {
                    // A div acting as a button still has to answer the keyboard.
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }
                : undefined
            }
            className={cn(
              "rounded-[var(--ob-radius-container)] border border-[var(--ob-line)] bg-[var(--ob-surface-low)] p-3.5",
              onRowClick &&
                "cursor-pointer transition-colors hover:border-[var(--ob-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ob-primary)]"
            )}
          >
            <dl className="flex flex-col gap-2">
              {mobileColumns.map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3">
                  <dt className="ob-mono shrink-0 uppercase text-[var(--ob-text-muted)]">
                    {col.mobileLabel ?? col.header}
                  </dt>
                  <dd
                    className={cn(
                      "min-w-0 text-end text-[13px] text-[var(--ob-text)]",
                      col.numeric && "font-mono tabular-nums"
                    )}
                  >
                    {col.cell ? col.cell(row) : renderValue(row[col.key])}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Renders a raw cell value without stringifying null/undefined into "null". */
function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return "—";
  return String(value);
}
