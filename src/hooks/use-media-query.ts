"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Matches a CSS media query, SSR-safe.
 *
 * Read through useSyncExternalStore so the server render and the first client
 * paint agree (both use `serverFallback`) and there is no post-mount setState.
 */
export function useMediaQuery(query: string, serverFallback = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverFallback
  );
}

/** Tailwind's `lg` breakpoint — where the sidebar stops being an overlay drawer. */
export function useIsDesktop(): boolean {
  // Defaults to true on the server so the desktop shell is what gets rendered
  // first; a phone corrects it on hydration, which is the cheaper mistake.
  return useMediaQuery("(min-width: 1024px)", true);
}
