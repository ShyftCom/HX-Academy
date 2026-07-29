"use client";

import { createContext, useContext, useRef, useState, useCallback } from "react";

interface HeaderOverlayState {
  /** Whether the current page has a dark hero for the header to sit transparently over. */
  overlay: boolean;
  /** Called by <Hero enableHeaderOverlay /> on mount/unmount. Ref-counted so nested
   *  effects (e.g. fast client-side nav) can't leave the flag stuck on. */
  registerHero: (active: boolean) => void;
}

const HeaderOverlayContext = createContext<HeaderOverlayState | null>(null);

export function HeaderOverlayProvider({ children }: { children: React.ReactNode }) {
  const [overlay, setOverlay] = useState(false);
  const countRef = useRef(0);

  const registerHero = useCallback((active: boolean) => {
    countRef.current += active ? 1 : -1;
    if (countRef.current < 0) countRef.current = 0;
    setOverlay(countRef.current > 0);
  }, []);

  return (
    <HeaderOverlayContext.Provider value={{ overlay, registerHero }}>
      {children}
    </HeaderOverlayContext.Provider>
  );
}

export function useHeaderOverlay() {
  const ctx = useContext(HeaderOverlayContext);
  if (!ctx) return { overlay: false, registerHero: () => {} };
  return ctx;
}
