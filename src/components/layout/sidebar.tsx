"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  ShoppingBag,
  ClipboardList,
  Globe,
  BarChart3,
  Bell,
  Activity,
  Settings,
  ChevronDown,
  ChevronRight,
  Folder,
  MessagesSquare,
  FileText,
  Shield,
  Package,
  Inbox,
  UploadCloud,
  PanelsTopLeft,
  Palette,
  CalendarDays,
  MapPin,
  TrendingUp,
  Receipt,
  Users2,
  CalendarOff,
  Banknote,
  Link2,
  Zap,
  Star,
  Navigation,
  Layers,
  Store,
  ShoppingCart,
  ImagePlay,
  Handshake,
  Sun,
  Ticket,
} from "lucide-react";

interface NavItem {
  tKey: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
  badge?: number;
}

const navItems: NavItem[] = [
  { tKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { tKey: "stations", href: "/dashboard/stations", icon: MapPin },
  { tKey: "leads", href: "/dashboard/leads", icon: MessagesSquare },
  { tKey: "calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { tKey: "players", href: "/dashboard/players", icon: UserCheck },
  {
    tKey: "subscriptions",
    icon: CreditCard,
    children: [
      { tKey: "plans", href: "/dashboard/subscriptions/plans", icon: FileText },
      { tKey: "subscriptions", href: "/dashboard/subscriptions", icon: CreditCard },
    ],
  },
  { tKey: "payments", href: "/dashboard/payments", icon: CreditCard },
  {
    tKey: "finance",
    icon: TrendingUp,
    children: [
      { tKey: "profit_overview", href: "/dashboard/finance", icon: BarChart3 },
      { tKey: "charges", href: "/dashboard/finance/charges", icon: Receipt },
    ],
  },
  {
    tKey: "hrm",
    icon: Users2,
    children: [
      { tKey: "hrm_dashboard", href: "/dashboard/hrm", icon: LayoutDashboard },
      { tKey: "staff", href: "/dashboard/hrm/staff", icon: UserCheck },
      { tKey: "attendance", href: "/dashboard/hrm/attendance", icon: CalendarDays },
      { tKey: "leave", href: "/dashboard/hrm/leave", icon: CalendarOff },
      { tKey: "payroll", href: "/dashboard/hrm/payroll", icon: Banknote },
    ],
  },
  {
    tKey: "store",
    icon: ShoppingBag,
    children: [
      { tKey: "products", href: "/dashboard/store/products", icon: Package },
      { tKey: "categories", href: "/dashboard/store/categories", icon: Folder },
      { tKey: "order_form", href: "/dashboard/store/form-builder", icon: ClipboardList },
      { tKey: "store_orders", href: "/dashboard/store/orders", icon: ShoppingCart },
    ],
  },
  { tKey: "orders", href: "/dashboard/orders", icon: ClipboardList },
  {
    tKey: "summer_camp",
    icon: Sun,
    children: [
      { tKey: "sc_plans", href: "/dashboard/summer-camp/plans", icon: Sun },
    ],
  },
  { tKey: "tickets", href: "/dashboard/tickets", icon: Ticket },
  {
    tKey: "website",
    icon: Globe,
    children: [
      { tKey: "landing", href: "/dashboard/website/landing", icon: PanelsTopLeft },
      { tKey: "header", href: "/dashboard/website/header", icon: Navigation },
      { tKey: "footer", href: "/dashboard/website/footer", icon: Layers },
      { tKey: "slides", href: "/dashboard/website/slides", icon: ImagePlay },
      { tKey: "sponsors", href: "/dashboard/website/sponsors", icon: Handshake },
      { tKey: "store_settings", href: "/dashboard/website/store", icon: Store },
      { tKey: "reviews", href: "/dashboard/website/reviews", icon: Star },
      { tKey: "surveys", href: "/dashboard/surveys", icon: FileText },
      { tKey: "sc_page", href: "/dashboard/website/summer-camp", icon: Sun },
      { tKey: "file_requirements", href: "/dashboard/website/file-requirements", icon: UploadCloud },
      { tKey: "applications", href: "/dashboard/website/applications", icon: Inbox },
      { tKey: "pixels", href: "/dashboard/settings/pixels", icon: Zap },
    ],
  },
  { tKey: "reports", href: "/dashboard/reports", icon: BarChart3 },
  { tKey: "notifications", href: "/dashboard/notifications", icon: Bell },
  { tKey: "activity_logs", href: "/dashboard/activity-logs", icon: Activity },
  { tKey: "file_manager", href: "/dashboard/files", icon: Folder },
  {
    tKey: "admin",
    icon: Shield,
    children: [
      { tKey: "users", href: "/dashboard/users", icon: Users },
      { tKey: "roles", href: "/dashboard/roles", icon: Shield },
      { tKey: "affiliates", href: "/dashboard/affiliates", icon: Link2 },
    ],
  },
  { tKey: "branding", href: "/dashboard/branding", icon: Palette },
  { tKey: "settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation("common");

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--sidebar-border)", color: "var(--text-primary)" }}
        className={cn(
          "fixed left-0 top-0 z-30 flex h-full w-64 flex-col transition-transform duration-300 lg:relative lg:translate-x-0 border-e",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div style={{ borderColor: "var(--sidebar-border)" }} className="flex h-16 items-center gap-2 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 font-bold text-xs text-white">FSA</div>
          <span style={{ color: "var(--text-primary)" }} className="font-semibold text-sm">{t("misc.academy_name")}</span>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-0.5 px-3">
            {navItems.map((item) => (
              <NavItemComponent key={item.tKey} item={item} onClose={onClose} />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div style={{ borderColor: "var(--sidebar-border)" }} className="border-t p-3">
          <p style={{ color: "var(--text-muted)" }} className="text-xs text-center">{t("misc.platform")}</p>
        </div>
      </aside>
    </>
  );
}

function NavItemComponent({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some((c) => c.href && pathname.startsWith(c.href));
  });

  const label = t(`nav.${item.tKey}`);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          style={{ color: "var(--text-secondary)" }}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            "hover:bg-gray-100 dark:hover:bg-white/10",
            open && "bg-gray-100 dark:bg-white/5"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-start">{label}</span>
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
            : <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />}
        </button>
        {open && (
          <div className="ms-3 mt-0.5 space-y-0.5 border-s border-gray-200 dark:border-white/10 ps-3">
            {item.children.map((child) => (
              <NavItemComponent key={child.tKey} item={child} onClose={onClose} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = item.href === "/dashboard"
    ? pathname === item.href
    : pathname.startsWith(item.href!);

  return (
    <Link
      href={item.href!}
      onClick={onClose}
      style={isActive ? undefined : { color: "var(--text-secondary)" }}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-blue-600 text-white"
          : "hover:bg-gray-100 dark:hover:bg-white/10"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="ms-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  );
}
