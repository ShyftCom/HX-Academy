import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Trail above the title. The last crumb is the current page and isn't linked. */
  breadcrumbs?: Crumb[];
  /** Actions — buttons live here, right-aligned on desktop, stacked on mobile. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * The single page heading used across the platform.
 *
 * Every page gets exactly one <h1>, which is what makes the heading order
 * navigable for screen-reader users — the previous mix of ad-hoc <h1>/<div>
 * headings per page did not guarantee that.
 */
export function PageHeader({ title, description, breadcrumbs, children, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2.5">
          <ol className="flex flex-wrap items-center gap-1">
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                  {crumb.href && !last ? (
                    <Link
                      href={crumb.href}
                      className="ob-mono uppercase text-[var(--ob-text-muted)] transition-colors hover:text-[var(--ob-text-secondary)]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className="ob-mono uppercase text-[var(--ob-text-secondary)]"
                      aria-current={last ? "page" : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}
                  {!last && (
                    // rtl:scale-x-[-1] — a chevron must point along the reading
                    // direction, and Arabic reads right to left.
                    <ChevronRight
                      className="h-3 w-3 text-[var(--ob-text-muted)] opacity-50 rtl:scale-x-[-1]"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.025em] text-[var(--ob-text)] md:text-[26px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ob-text-muted)]">{description}</p>
          )}
        </div>

        {children && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
        )}
      </div>
    </div>
  );
}
