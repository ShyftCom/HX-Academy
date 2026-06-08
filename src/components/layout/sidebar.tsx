"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
  badge?: number;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Leads CRM", href: "/dashboard/leads", icon: MessagesSquare },
  { title: "Players", href: "/dashboard/players", icon: UserCheck },
  {
    title: "Subscriptions",
    icon: CreditCard,
    children: [
      { title: "Plans", href: "/dashboard/subscriptions/plans", icon: FileText },
      { title: "Subscriptions", href: "/dashboard/subscriptions", icon: CreditCard },
    ],
  },
  { title: "Payments", href: "/dashboard/payments", icon: CreditCard },
  {
    title: "Store",
    icon: ShoppingBag,
    children: [
      { title: "Products", href: "/dashboard/store/products", icon: Package },
      { title: "Categories", href: "/dashboard/store/categories", icon: Folder },
      { title: "Order Form", href: "/dashboard/store/form-builder", icon: ClipboardList },
    ],
  },
  { title: "Orders", href: "/dashboard/orders", icon: ClipboardList },
  {
    title: "Website & Apps",
    icon: Globe,
    children: [
      { title: "Landing Page", href: "/dashboard/website/landing", icon: PanelsTopLeft },
      { title: "Survey Builder", href: "/dashboard/surveys", icon: FileText },
      { title: "File Requirements", href: "/dashboard/website/file-requirements", icon: UploadCloud },
      { title: "Applications", href: "/dashboard/website/applications", icon: Inbox },
    ],
  },
  { title: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { title: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { title: "Activity Logs", href: "/dashboard/activity-logs", icon: Activity },
  { title: "File Manager", href: "/dashboard/files", icon: Folder },
  {
    title: "Admin",
    icon: Shield,
    children: [
      { title: "Users", href: "/dashboard/users", icon: Users },
      { title: "Roles & Permissions", href: "/dashboard/roles", icon: Shield },
    ],
  },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 flex h-full w-64 flex-col transition-transform duration-300 lg:relative lg:translate-x-0",
          "bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-700",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-sm text-white">HX</div>
          <span className="font-semibold text-gray-900 dark:text-white">HX Academy</span>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-0.5 px-3">
            {navItems.map((item) => (
              <NavItemComponent key={item.title} item={item} onClose={onClose} />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">HX Academy ERP v1.0</p>
        </div>
      </aside>
    </>
  );
}

function NavItemComponent({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some((c) => c.href && pathname.startsWith(c.href));
  });

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            "dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white",
            open && "bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.title}</span>
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
            : <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />}
        </button>
        {open && (
          <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 dark:border-white/10 pl-3">
            {item.children.map((child) => (
              <NavItemComponent key={child.title} item={child} onClose={onClose} />
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
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-blue-600 text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.title}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  );
}
