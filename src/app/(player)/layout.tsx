"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import Link from "next/link";
import { Bell, CreditCard, FileText, Home, LogOut, Moon, ShoppingBag, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { FullPageLoader } from "@/components/shared/loading-spinner";
import { I18nProvider } from "@/components/providers/i18n-provider";

const navItems = [
  { href: "/player", icon: Home, tKey: "player.home" },
  { href: "/player/subscriptions", icon: CreditCard, tKey: "player.subscriptions" },
  { href: "/player/documents", icon: FileText, tKey: "player.documents" },
  { href: "/player/store", icon: ShoppingBag, tKey: "player.store" },
  { href: "/player/notifications", icon: Bell, tKey: "player.notifications" },
  { href: "/player/profile", icon: User, tKey: "player.profile" },
];

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <PlayerShell>{children}</PlayerShell>
    </I18nProvider>
  );
}

/** Separated so the shell can use useTranslation under the provider above it. */
function PlayerShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !(session?.user as { isPlayer?: boolean })?.isPlayer) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") return <FullPageLoader />;
  if (status === "unauthenticated") return null;

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <div className="ob-app flex h-screen flex-col bg-[var(--ob-surface-base)] text-[var(--ob-text)]">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--ob-line)] bg-[var(--ob-surface-lowest)] px-4">
        <Link href="/player" className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--ob-radius-control)] bg-[var(--ob-primary)] text-[10px] font-bold text-white"
            aria-hidden="true"
          >
            FSA
          </span>
          <span className="truncate text-sm font-semibold">{t("misc.academy_name")}</span>
        </Link>

        <div className="flex items-center gap-1">
          <LanguageSwitcher variant="admin" />
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? t("shell.theme_light") : t("shell.theme_dark")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--ob-radius-control)] text-[var(--ob-text-secondary)] transition-colors hover:bg-[var(--ob-surface-high)] hover:text-[var(--ob-text)]"
          >
            {mounted && (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
          </button>
          <button
            type="button"
            onClick={() => router.push("/player/profile")}
            aria-label={t("player.profile")}
            className="rounded-full"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(session?.user?.name ?? "P")}</AvatarFallback>
            </Avatar>
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label={t("nav.sign_out")}
            title={t("nav.sign_out")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--ob-radius-control)] text-[var(--ob-text-secondary)] transition-colors hover:bg-[var(--ob-surface-high)] hover:text-[var(--ob-error)]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* pb-24 clears the fixed bottom bar; without it the last card sits under it. */}
      <main className="flex-1 overflow-y-auto px-[var(--ob-margin)] py-5 pb-24">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>

      <nav
        aria-label={t("shell.main_navigation")}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--ob-line)] bg-[var(--ob-surface-lowest)]/95 backdrop-blur-md"
        // Keeps the bar clear of the iOS home indicator.
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-3xl">
          {navItems.map((item) => {
            const active =
              item.href === "/player" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                // min-h-[52px] keeps every target above the 44px touch minimum.
                className={cn(
                  "relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] transition-colors",
                  active
                    ? "text-[var(--ob-primary-light)]"
                    : "text-[var(--ob-text-muted)] hover:text-[var(--ob-text-secondary)]"
                )}
              >
                {active && (
                  <span
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-[var(--ob-primary)]"
                    aria-hidden="true"
                  />
                )}
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate">{t(item.tKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
