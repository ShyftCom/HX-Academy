"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageLoader } from "@/components/shared/loading-spinner";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { PixelProvider } from "@/components/providers/pixel-provider";
import { StationProvider } from "@/context/StationContext";

export default function BackOfficeLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated" && (session?.user as any)?.isPlayer) {
      router.push("/player");
    }
  }, [status, session, router]);

  if (status === "loading") return <FullPageLoader />;
  if (status === "unauthenticated") return null;
  if ((session?.user as any)?.isPlayer) return null;

  return (
    <I18nProvider>
      <StationProvider>
      <PixelProvider />
      <div style={{ background: "var(--background)", color: "var(--text-primary)" }} className="flex h-screen overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
      </StationProvider>
    </I18nProvider>
  );
}
