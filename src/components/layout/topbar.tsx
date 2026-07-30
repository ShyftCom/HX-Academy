"use client";

import { Bell, LogOut, Menu, Moon, Settings, Sun, User } from "lucide-react";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { StationSwitcher } from "@/components/layout/station-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { cn, getInitials } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHydrated } from "@/hooks/use-hydrated";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

interface TopbarProps {
  onMenuClick: () => void;
}

/** Shared shape for the icon-only controls, so they line up on a 36px grid. */
const iconButton = cn(
  "relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--ob-radius-control)]",
  "text-[var(--ob-text-secondary)] transition-colors",
  "hover:bg-[var(--ob-surface-high)] hover:text-[var(--ob-text)]"
);

export function Topbar({ onMenuClick }: TopbarProps) {
  const { t } = useTranslation("common");
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();
  const { data: session } = useSession();
  const router = useRouter();

  // Polled through React Query rather than a bare useEffect+fetch, so the
  // badge refreshes while the tab is open and shares its cache with the
  // notifications page instead of racing it with a second request.
  const { data: unread } = useQuery<{ count: number }>({
    queryKey: ["notifications-unread"],
    queryFn: () => fetch("/api/notifications/unread-count").then((r) => r.json()),
    refetchInterval: 60_000,
    retry: false,
  });
  const unreadCount = unread?.count ?? 0;

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const userName = session?.user?.name ?? "";
  const userEmail = session?.user?.email ?? "";

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-[var(--ob-topbar-h)] shrink-0 items-center gap-2",
        "border-b border-[var(--ob-line)] bg-[var(--ob-surface-lowest)]/95 px-3 backdrop-blur-md md:px-4"
      )}
    >
      <button
        type="button"
        onClick={onMenuClick}
        className={cn(iconButton, "lg:hidden")}
        aria-label={t("shell.open_menu")}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Station scope sits at the start of the bar — it qualifies everything
          on the page, so it reads as context rather than as an action. */}
      <StationSwitcher />

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <LanguageSwitcher variant="admin" />

        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={iconButton}
          aria-label={isDark ? t("shell.theme_light") : t("shell.theme_dark")}
          title={isDark ? t("shell.theme_light") : t("shell.theme_dark")}
        >
          {/* Rendered only after mount: server and client disagree about the
              resolved theme, and swapping the icon during hydration warns. */}
          {mounted &&
            (isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />)}
        </button>

        <Link
          href="/dashboard/notifications"
          className={iconButton}
          aria-label={
            unreadCount > 0
              ? `${t("shell.notifications")} — ${t("shell.unread_notifications", { count: unreadCount })}`
              : t("shell.notifications")
          }
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="ob-mono absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ob-primary)] px-1 text-[10px] font-semibold text-white"
              aria-hidden="true"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <div className="mx-1 h-5 w-px bg-[var(--ob-line)]" aria-hidden="true" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-[var(--ob-radius-control)] p-1 transition-colors hover:bg-[var(--ob-surface-high)]"
              aria-label={t("shell.account_menu")}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={session?.user?.image ?? ""} alt="" />
                <AvatarFallback>{getInitials(userName || "U")}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[140px] truncate text-sm text-[var(--ob-text-secondary)] md:block">
                {userName}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-[var(--ob-text)]">{userName}</span>
                <span className="ob-mono truncate normal-case text-[var(--ob-text-muted)]">{userEmail}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <User className="me-2 h-4 w-4" aria-hidden="true" />
                {t("nav.profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="me-2 h-4 w-4" aria-hidden="true" />
                {t("nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} destructive>
              <LogOut className="me-2 h-4 w-4" aria-hidden="true" />
              {t("nav.sign_out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
