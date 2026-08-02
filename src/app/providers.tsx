"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        {/* Obsidian Flux is a dark system, so dark is the default. The toggle is
            kept and next-themes still persists a light choice — a fresh visitor
            just lands on the designed palette instead of the old light one. */}
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            closeButton
            toastOptions={{
              style: {
                background: "rgba(32,31,31,0.92)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(229,226,225,0.20)",
                borderRadius: "8px",
                color: "#e5e2e1",
                fontFamily: "var(--font-geist), system-ui, sans-serif",
              },
            }}
          />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
