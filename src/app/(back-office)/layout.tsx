"use client";

import { useEffect, useState } from "react";
import { Sidebar, useSidebarCollapsed } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FullPageLoader } from "@/components/shared/loading-spinner";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { PixelProvider } from "@/components/providers/pixel-provider";
import { StationProvider } from "@/context/StationContext";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useTranslation } from "react-i18next";

export default function BackOfficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <StationProvider>
        <BackOfficeShell>{children}</BackOfficeShell>
      </StationProvider>
    </I18nProvider>
  );
}

/**
 * Split from the exported layout so the shell can call useTranslation — the
 * hook needs the I18nProvider above it in the tree, and a component cannot
 * consume a provider it renders itself.
 */
function BackOfficeShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const isDesktop = useIsDesktop();

  // The collapsed rail is a desktop affordance only. Below `lg` the sidebar is
  // an overlay drawer, and a 76px icon-only drawer is unusable on touch: there
  // are no labels, and the tooltips that replace them are hover-only. So a
  // collapse preference set on desktop must not follow the user onto a phone.
  const railCollapsed = collapsed && isDesktop;
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated" && (session?.user as { isPlayer?: boolean })?.isPlayer) {
      router.push("/player");
    }
  }, [status, session, router]);

  if (status === "loading") return <FullPageLoader />;
  if (status === "unauthenticated") return null;
  if ((session?.user as { isPlayer?: boolean })?.isPlayer) return null;

  return (
    // `ob-app` is what activates the Obsidian palette and the Tailwind
    // compatibility layer in globals.css. The public showcase site sits
    // outside it and keeps its own fsa-* theme untouched.
    <div className="ob-app flex h-screen overflow-hidden bg-[var(--ob-surface-base)] text-[var(--ob-text)]">
      <PixelProvider />

      <a
        href="#ob-main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-[var(--ob-radius-control)] focus:bg-[var(--ob-primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        {t("shell.skip_to_content")}
      </a>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={railCollapsed}
        onCollapsedChange={setCollapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main
          id="ob-main"
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-[var(--ob-margin)] py-6 focus:outline-none"
        >
          {/* Capped so dashboards don't stretch to 2560px on an ultrawide,
              where a 12-column grid becomes unreadable end-to-end. */}
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
