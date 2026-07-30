"use client";

import { useSyncExternalStore } from "react";

// Hydration state never changes after the first client render, so there is
// nothing to subscribe to.
const noopSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * `true` once the component has hydrated on the client, `false` during SSR and
 * the first paint.
 *
 * Needed wherever server and client legitimately disagree — most often
 * next-themes, where `resolvedTheme` is unknowable on the server, so rendering
 * a sun-vs-moon icon before hydration produces a mismatch warning.
 *
 * The usual spelling of this is `useState(false)` plus `useEffect(() =>
 * setMounted(true), [])`, which schedules a second render on every mount and
 * trips react-hooks/set-state-in-effect. useSyncExternalStore expresses the
 * same thing with the server/client split built in and no extra render.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, onClient, onServer);
}
