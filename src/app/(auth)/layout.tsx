"use client";

import { I18nProvider } from "@/components/providers/i18n-provider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <div className="ob-app relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--ob-surface-base)] p-4">
        {/* Two very low-opacity radial washes give the flat charcoal some depth
            behind the card without becoming the "heavy gradient" the design
            system rules out. Purely decorative, so hidden from assistive tech. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(0,112,243,0.10) 0%, transparent 70%)," +
              "radial-gradient(40% 40% at 85% 100%, rgba(60,215,255,0.06) 0%, transparent 70%)",
          }}
        />
        {/* Faint grid — the "technical cockpit" texture, at 3% so it reads as
            surface rather than as content. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(229,226,225,1) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(229,226,225,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative w-full max-w-md">{children}</div>
      </div>
    </I18nProvider>
  );
}
