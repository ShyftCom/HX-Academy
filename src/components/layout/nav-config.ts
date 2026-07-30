import type { LucideIcon } from "lucide-react";
import {
  Activity, Banknote, BarChart3, Bell, CalendarDays, CalendarOff, ClipboardList,
  CreditCard, FileText, Folder, Globe, Handshake, ImagePlay, Inbox, Layers,
  LayoutDashboard, Link2, MapPin, MessagesSquare, Navigation, Package, Palette,
  PanelsTopLeft, Receipt, Settings, Shield, ShoppingBag, ShoppingCart, Star,
  Store, Sun, Ticket, TrendingUp, Trophy, UploadCloud, UserCheck, Users, Users2,
  Zap,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/permission-names";

export interface NavItem {
  /** Resolved as `nav.<tKey>` — every key exists in fr/eng/ar. */
  tKey: string;
  href?: string;
  icon: LucideIcon;
  children?: NavItem[];
  /**
   * Hide the entry unless the user holds one of these. Omit for entries every
   * signed-in staff member may open. A parent group is hidden automatically
   * once all of its children are.
   */
  permission?: string | string[];
}

export interface NavSection {
  /** Resolved as `nav.sections.<tKey>`. */
  tKey: string;
  items: NavItem[];
}

/**
 * Sidebar information architecture.
 *
 * The previous sidebar was a flat list of 20 top-level entries with no
 * grouping, which is why the hierarchy read as undifferentiated. Entries are
 * now grouped by what the user is *trying to do* — run the academy, collect
 * money, sell things, manage people, publish the site, administer the system —
 * so scanning is a two-step (find the group, find the item) instead of a
 * twenty-item linear search.
 *
 * Only modules that exist in this repository are listed. Nothing is invented.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    tKey: "overview",
    items: [
      { tKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
      { tKey: "reports", href: "/dashboard/reports", icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
      { tKey: "calendar", href: "/dashboard/calendar", icon: CalendarDays },
    ],
  },
  {
    tKey: "academy",
    items: [
      { tKey: "stations", href: "/dashboard/stations", icon: MapPin },
      { tKey: "players", href: "/dashboard/players", icon: UserCheck, permission: PERMISSIONS.PLAYERS_VIEW },
      {
        tKey: "leads",
        icon: MessagesSquare,
        permission: PERMISSIONS.LEADS_VIEW,
        children: [
          { tKey: "leads", href: "/dashboard/leads", icon: MessagesSquare },
          { tKey: "pipeline", href: "/dashboard/leads/pipeline", icon: Layers },
        ],
      },
      {
        tKey: "summer_camp",
        icon: Sun,
        children: [
          { tKey: "sc_plans", href: "/dashboard/summer-camp/plans", icon: Sun },
          { tKey: "sc_sessions", href: "/dashboard/summer-camp/sessions", icon: CalendarDays },
          { tKey: "sc_players", href: "/dashboard/summer-camp/players", icon: Users },
        ],
      },
      { tKey: "tickets", href: "/dashboard/tickets", icon: Ticket },
    ],
  },
  {
    tKey: "revenue",
    items: [
      {
        tKey: "subscriptions",
        icon: CreditCard,
        permission: PERMISSIONS.SUBS_VIEW,
        children: [
          { tKey: "subscriptions", href: "/dashboard/subscriptions", icon: CreditCard },
          { tKey: "plans", href: "/dashboard/subscriptions/plans", icon: FileText },
        ],
      },
      { tKey: "payments", href: "/dashboard/payments", icon: Receipt, permission: PERMISSIONS.PAYMENTS_VIEW },
      {
        tKey: "finance",
        icon: TrendingUp,
        children: [
          { tKey: "profit_overview", href: "/dashboard/finance", icon: BarChart3 },
          { tKey: "charges", href: "/dashboard/finance/charges", icon: Receipt },
        ],
      },
    ],
  },
  {
    tKey: "commerce",
    items: [
      {
        tKey: "store",
        icon: ShoppingBag,
        permission: PERMISSIONS.STORE_VIEW,
        children: [
          { tKey: "products", href: "/dashboard/store/products", icon: Package },
          { tKey: "categories", href: "/dashboard/store/categories", icon: Folder },
          { tKey: "order_form", href: "/dashboard/store/form-builder", icon: ClipboardList },
          { tKey: "store_orders", href: "/dashboard/store/orders", icon: ShoppingCart },
        ],
      },
      { tKey: "orders", href: "/dashboard/orders", icon: ClipboardList, permission: PERMISSIONS.ORDERS_VIEW },
    ],
  },
  {
    tKey: "people",
    items: [
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
      { tKey: "affiliate", href: "/dashboard/affiliate", icon: Link2 },
    ],
  },
  {
    tKey: "web",
    items: [
      {
        tKey: "website",
        icon: Globe,
        permission: PERMISSIONS.WEBSITE_VIEW,
        children: [
          { tKey: "pages", href: "/dashboard/website/pages", icon: PanelsTopLeft },
          { tKey: "programmes", href: "/dashboard/website/programmes", icon: Trophy },
          { tKey: "venues_website", href: "/dashboard/website/venues", icon: MapPin },
          { tKey: "squads_website", href: "/dashboard/website/squads", icon: Users2 },
          { tKey: "coaches", href: "/dashboard/website/coaches", icon: UserCheck },
          { tKey: "pathway", href: "/dashboard/website/pathway", icon: TrendingUp },
          { tKey: "news", href: "/dashboard/website/news", icon: FileText },
          { tKey: "faqs", href: "/dashboard/website/faqs", icon: MessagesSquare },
          { tKey: "slides", href: "/dashboard/website/slides", icon: ImagePlay },
          { tKey: "sponsors", href: "/dashboard/website/sponsors", icon: Handshake },
          { tKey: "reviews", href: "/dashboard/website/reviews", icon: Star },
          { tKey: "header", href: "/dashboard/website/header", icon: Navigation },
          { tKey: "footer", href: "/dashboard/website/footer", icon: Layers },
          { tKey: "store_settings", href: "/dashboard/website/store", icon: Store },
          { tKey: "sc_page", href: "/dashboard/website/summer-camp", icon: Sun },
          { tKey: "redirects", href: "/dashboard/website/redirects", icon: Link2 },
          { tKey: "pixels", href: "/dashboard/settings/pixels", icon: Zap },
        ],
      },
      { tKey: "contact_website", href: "/dashboard/website/contact", icon: Inbox },
      { tKey: "applications", href: "/dashboard/website/applications", icon: Inbox, permission: PERMISSIONS.APPLICATIONS_VIEW },
      { tKey: "file_requirements", href: "/dashboard/website/file-requirements", icon: UploadCloud, permission: PERMISSIONS.FILE_REQUIREMENTS_MANAGE },
      { tKey: "surveys", href: "/dashboard/surveys", icon: FileText },
    ],
  },
  {
    tKey: "system",
    items: [
      { tKey: "notifications", href: "/dashboard/notifications", icon: Bell },
      { tKey: "file_manager", href: "/dashboard/files", icon: Folder },
      { tKey: "activity_logs", href: "/dashboard/activity-logs", icon: Activity },
      {
        tKey: "admin",
        icon: Shield,
        permission: [PERMISSIONS.USERS_VIEW, PERMISSIONS.ROLES_VIEW],
        children: [
          { tKey: "users", href: "/dashboard/users", icon: Users, permission: PERMISSIONS.USERS_VIEW },
          { tKey: "roles", href: "/dashboard/roles", icon: Shield, permission: PERMISSIONS.ROLES_VIEW },
          { tKey: "affiliates", href: "/dashboard/affiliates", icon: Link2 },
        ],
      },
      { tKey: "branding", href: "/dashboard/branding", icon: Palette, permission: PERMISSIONS.SETTINGS_VIEW },
      { tKey: "settings", href: "/dashboard/settings", icon: Settings, permission: PERMISSIONS.SETTINGS_VIEW },
    ],
  },
];

/** Longest-prefix match, so /dashboard/leads/pipeline highlights Pipeline, not Leads. */
export function isItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}
