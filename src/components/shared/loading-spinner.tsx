import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)} role="status">
      <Loader2 className="h-5 w-5 animate-spin text-[var(--ob-primary-light)]" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/**
 * Full-viewport loader for auth gates and route transitions.
 *
 * Deliberately minimal: this shows before the shell exists, so it can't
 * reference the sidebar or top bar. Skeletons are the right tool once the
 * layout is known — see components/shared/skeleton.tsx.
 */
export function FullPageLoader() {
  return (
    <div
      className="ob-app flex h-full min-h-screen w-full items-center justify-center bg-[var(--ob-surface-base)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--ob-primary)]" aria-hidden="true" />
        <p className="ob-mono uppercase text-[var(--ob-text-muted)]">Loading</p>
      </div>
    </div>
  );
}
