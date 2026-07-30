"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  /**
   * Milliseconds to wait before propagating a keystroke. Set it when `onChange`
   * triggers a network request, so typing "abdelkader" fires one query rather
   * than ten. Pass 0 for pure client-side filtering.
   */
  debounceMs?: number;
  "aria-label"?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  debounceMs = 0,
  "aria-label": ariaLabel,
}: SearchInputProps) {
  // Local state keeps the field responsive while the debounced value settles.
  // The parent's value is adjusted *during render* rather than synced in an
  // effect, so a reset ("clear filters") shows immediately instead of painting
  // one frame with the stale text. See react.dev/reference/react/useState —
  // "storing information from previous renders".
  const [local, setLocal] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setLocal(value);
  }

  useEffect(() => {
    if (debounceMs <= 0 || local === value) return;
    const id = setTimeout(() => onChange(local), debounceMs);
    return () => clearTimeout(id);
    // `onChange` is intentionally omitted: callers routinely pass an inline
    // arrow, and including it would restart the timer on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, debounceMs]);

  const commit = (next: string) => {
    setLocal(next);
    if (debounceMs <= 0) onChange(next);
  };

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ob-text-muted)]"
        aria-hidden="true"
      />
      <input
        type="search"
        value={local}
        onChange={(e) => commit(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          "h-9 w-full rounded-[var(--ob-radius-control)] border ps-9 pe-9 text-sm",
          "border-[var(--ob-line-strong)] bg-[var(--ob-surface)] text-[var(--ob-text)]",
          "placeholder:text-[var(--ob-text-muted)]",
          "transition-[border-color,box-shadow] duration-150",
          "focus-visible:border-[var(--ob-primary)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ob-primary-glow)]",
          // Chrome's native clear button is a black glyph on a dark field.
          "[&::-webkit-search-cancel-button]:hidden"
        )}
      />
      {local && (
        <button
          type="button"
          onClick={() => {
            setLocal("");
            onChange("");
          }}
          aria-label="Clear search"
          className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-[2px] p-0.5 text-[var(--ob-text-muted)] transition-colors hover:text-[var(--ob-text)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
