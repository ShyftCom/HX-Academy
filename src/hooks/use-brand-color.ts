"use client";

import { useSyncExternalStore } from "react";
import { brand } from "@/lib/design-tokens";

/**
 * Reads a CSS custom property off the document root.
 *
 * Charts need a literal colour: recharts passes `stroke` and `stopColor`
 * straight through as SVG attributes, where `var(--ob-primary)` does not
 * resolve. So anything drawn by recharts cannot pick up the admin's brand
 * colour through CSS the way the rest of the UI does — it has to be read.
 *
 * Without this the revenue chart is pinned to the design system's #0070f3,
 * which on the red-branded production install drew a blue line through an
 * otherwise entirely red interface.
 */
function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// Branding is emitted once into a <style> in the document head and never
// changes for the life of the page, so there is nothing to subscribe to.
const noopSubscribe = () => () => {};

/**
 * The academy's brand colour, or the design-system default.
 *
 * useSyncExternalStore rather than useState+useEffect so the server render and
 * the first client paint agree on the fallback, and there is no post-mount
 * setState to re-draw the chart.
 */
export function useBrandPrimary(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => readCssVar("--ob-primary", brand.primary),
    () => brand.primary
  );
}
