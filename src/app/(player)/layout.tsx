"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FullPageLoader } from "@/components/shared/loading-spinner";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, User, CreditCard, ShoppingBag, Bell, LogOut, Moon, Sun } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

const navItems = [
  { href: "/player", icon: Home, label: "Home" },
  { href: "/player/profile", icon: User, label: "Profile" },
  { href: "/player/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/player/store", icon: ShoppingBag, label: "Store" },
  { href: "/player/notifications", icon: Bell, label: "Notifications" },
];

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !(session?.user as any)?.isPlayer) router.push("/dashboard");
  }, [status, session, router]);

  if (status === "loading") return <FullPageLoader />;
  if (status === "unauthenticated") return null;

  return (
    <div style={{ background: "var(--background)", color: "var(--text-primary)" }} className="flex h-screen flex-col">
      {/* Top Header */}
      <header style={{ background: "var(--header-bg)", borderColor: "var(--header-border)", color: "var(--text-primary)" }} className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600 text-white font-bold text-xs">FSA</div>
          <span className="font-semibold text-sm">Foot-Ball Skills Academy</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="admin" />
          <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            {mounted && resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Avatar className="h-8 w-8 cursor-pointer" onClick={() => router.push("/player/profile")}>
            <AvatarFallback>{getInitials(session?.user?.name ?? "P")}</AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/login" })} title="Sign Out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav style={{ background: "var(--header-bg)", borderColor: "var(--header-border)" }} className="fixed bottom-0 left-0 right-0 border-t">
        <div className="flex">
          {navItems.map((item) => {
            const isActive = item.href === "/player" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={isActive ? undefined : { color: "var(--text-muted)" }} className={cn("flex flex-1 flex-col items-center justify-center py-2 text-xs transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "")}>
                <item.icon className={cn("h-5 w-5 mb-0.5", isActive && "fill-current opacity-20")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
