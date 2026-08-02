"use client";

import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { formatNumber } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, perPage, onPageChange }: PaginationProps) {
  const { t } = useTranslation("common");
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const pages = getPageNumbers(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center justify-between gap-3 border-t border-[var(--ob-line)] px-1 py-3 sm:flex-row"
    >
      <p className="ob-mono uppercase text-[var(--ob-text-muted)]">
        {t("common.showing_range", {
          start: formatNumber(total === 0 ? 0 : start),
          end: formatNumber(end),
          total: formatNumber(total),
        })}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={t("common.previous")}
        >
          {/* Chevrons mirror in RTL so "previous" still points backwards. */}
          <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" aria-hidden="true" />
        </Button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`gap-${i}`} className="px-1.5 text-[var(--ob-text-muted)]" aria-hidden="true">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon-sm"
              onClick={() => onPageChange(p as number)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Page ${p}`}
              className="font-mono tabular-nums"
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label={t("common.next")}
        >
          <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}
