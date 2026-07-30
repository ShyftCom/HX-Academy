"use client";

import React, { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/use-permissions";
import { NAV_SECTIONS, isItemActive, type NavItem } from "@/components/layout/nav-config";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const COLLAPSE_KEY = "ob_sidebar_collapsed";
/** Same-tab notification; the native `storage` event only reaches other tabs. */
const COLLAPSE_EVENT = "ob:sidebar-collapse";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
}

export function Sidebar({ isOpen, onClose, collapsed, onCollapsedChange }: SidebarProps) {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const { can } = usePermissions();

  // `null` means "the user has not touched the accordion on this route", in
  // which case the open group is derived from the URL below. Once they click,
  // their choice wins until they navigate somewhere else.
  const [manualGroup, setManualGroup] = useState<{ route: string; key: string | null } | null>(null);

  const visible = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items
          .map((item) => ({
            ...item,
            children: item.children?.filter((c) => can(c.permission)),
          }))
          // A group with every child filtered out is dead weight — drop it too.
          .filter((item) => can(item.permission) && (!item.children || item.children.length > 0)),
      })).filter((section) => section.items.length > 0),
    [can]
  );

  // The group owning the current route, so a deep link lands with its parent
  // already expanded rather than making the user hunt for it. Derived during
  // render rather than synced in an effect — an effect would render the
  // sidebar once with the wrong group open and then immediately re-render.
  const routeGroup = useMemo(() => {
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (item.children?.some((c) => c.href && isItemActive(c.href, pathname))) {
          return item.tKey;
        }
      }
    }
    return null;
  }, [pathname]);

  // A manual choice only applies to the route it was made on; navigating
  // elsewhere falls back to that route's own group.
  const openGroup = manualGroup?.route === pathname ? manualGroup.key : routeGroup;

  const toggleGroup = useCallback(
    (key: string) => {
      // Single-open accordion: keeps the rail short enough to scan, instead of
      // three or four groups being expanded at once.
      setManualGroup((cur) => {
        const current = cur?.route === pathname ? cur.key : routeGroup;
        return { route: pathname, key: current === key ? null : key };
      });
    },
    [pathname, routeGroup]
  );

  return (
    <>
      {/* Mobile scrim. Tapping it closes the drawer. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label={t("shell.main_navigation")}
        style={{ width: collapsed ? "var(--ob-sidebar-collapsed-w)" : "var(--ob-sidebar-w)" }}
        className={cn(
          "fixed inset-y-0 start-0 z-40 flex flex-col",
          "bg-[var(--ob-surface-lowest)] border-e border-[var(--ob-line)]",
          "transition-transform duration-200 ease-out lg:relative",
          // The off-screen transform is scoped to below `lg`, where the sidebar
          // is an overlay drawer. Above `lg` it is `relative` and in normal
          // flow, so it must carry no transform at all.
          //
          // This used to be `lg:translate-x-0` plus an unscoped
          // `rtl:translate-x-full`. Both are single-variant classes of equal
          // specificity, and Tailwind emits `rtl:` after `lg:`, so on an
          // Arabic desktop the RTL rule won and shoved the whole sidebar 100%
          // off the right edge — the back-office had no navigation at all.
          // `max-lg:` keeps the two from ever competing.
          !isOpen && "max-lg:-translate-x-full max-lg:rtl:translate-x-full"
        )}
      >
        <SidebarHeader collapsed={collapsed} onToggleCollapse={() => onCollapsedChange(!collapsed)} />

        <ScrollArea className="flex-1 py-3">
          <nav className="flex flex-col gap-5 px-3">
            {visible.map((section) => (
              <div key={section.tKey}>
                {/* Section labels are the structural separator the old flat
                    list lacked. Hidden when collapsed — a 76px rail has no
                    room for text, and the icons carry tooltips instead. */}
                {!collapsed && (
                  <p className="ob-mono px-3 pb-2 uppercase text-[var(--ob-text-muted)] opacity-70">
                    {t(`nav.sections.${section.tKey}`)}
                  </p>
                )}
                {collapsed && <div className="mx-2 mb-2 h-px bg-[var(--ob-line)]" />}
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => (
                    <NavEntry
                      key={item.tKey}
                      item={item}
                      collapsed={collapsed}
                      isGroupOpen={openGroup === item.tKey}
                      onToggleGroup={toggleGroup}
                      onNavigate={onClose}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t border-[var(--ob-line)] p-3">
          {collapsed ? (
            <div className="flex justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ob-success)]" aria-hidden="true" />
            </div>
          ) : (
            <p className="ob-mono text-center text-[var(--ob-text-muted)] opacity-60">
              {t("misc.platform")}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

function SidebarHeader({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { t } = useTranslation("common");

  return (
    <div
      className={cn(
        "flex h-[var(--ob-topbar-h)] shrink-0 items-center gap-2.5 border-b border-[var(--ob-line)]",
        collapsed ? "justify-center px-2" : "px-4"
      )}
    >
      <Link
        href="/dashboard"
        className="flex min-w-0 items-center gap-2.5"
        aria-label={t("misc.academy_name")}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ob-radius-control)] bg-[var(--ob-primary)] text-[11px] font-bold tracking-tight text-white"
          aria-hidden="true"
        >
          FSA
        </span>
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-[var(--ob-text)]">
            {t("misc.academy_name")}
          </span>
        )}
      </Link>

      {!collapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          title={t("shell.collapse_sidebar")}
          aria-label={t("shell.collapse_sidebar")}
          className="ms-auto hidden rounded-[var(--ob-radius-control)] p-1.5 text-[var(--ob-text-muted)] transition-colors hover:bg-[var(--ob-surface-high)] hover:text-[var(--ob-text)] lg:block"
        >
          <PanelLeftClose className="h-4 w-4 rtl:scale-x-[-1]" />
        </button>
      )}

      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          title={t("shell.expand_sidebar")}
          aria-label={t("shell.expand_sidebar")}
          className="absolute -end-3 top-[22px] hidden h-6 w-6 items-center justify-center rounded-full border border-[var(--ob-line-strong)] bg-[var(--ob-surface-high)] text-[var(--ob-text-muted)] transition-colors hover:text-[var(--ob-text)] lg:flex"
        >
          <PanelLeftOpen className="h-3.5 w-3.5 rtl:scale-x-[-1]" />
        </button>
      )}
    </div>
  );
}

function NavEntry({
  item,
  collapsed,
  isGroupOpen,
  onToggleGroup,
  onNavigate,
  depth = 0,
}: {
  item: NavItem;
  collapsed: boolean;
  isGroupOpen: boolean;
  onToggleGroup: (key: string) => void;
  onNavigate: () => void;
  depth?: number;
}) {
  const pathname = usePathname();
  const { t } = useTranslation("common");
  const label = t(`nav.${item.tKey}`);

  if (item.children?.length) {
    const hasActiveChild = item.children.some((c) => c.href && isItemActive(c.href, pathname));
    // Collapsed: the group behaves as a single icon that routes to its first
    // child, because there is nowhere to render an expanded submenu.
    if (collapsed) {
      const first = item.children.find((c) => c.href);
      return first?.href ? (
        <RailLink href={first.href} icon={item.icon} label={label} active={hasActiveChild} onNavigate={onNavigate} />
      ) : null;
    }

    return (
      <div>
        <button
          type="button"
          onClick={() => onToggleGroup(item.tKey)}
          aria-expanded={isGroupOpen}
          className={cn(
            "flex w-full items-center gap-3 rounded-[var(--ob-radius-control)] px-3 py-2 text-sm font-medium transition-colors",
            hasActiveChild
              ? "text-[var(--ob-text)]"
              : "text-[var(--ob-text-secondary)] hover:bg-[var(--ob-surface-high)] hover:text-[var(--ob-text)]"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-start">{label}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-[var(--ob-text-muted)] transition-transform duration-150",
              isGroupOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>

        {isGroupOpen && (
          <div className="ms-[22px] mt-0.5 flex flex-col gap-0.5 border-s border-[var(--ob-line)] ps-2.5">
            {item.children.map((child) => (
              <NavEntry
                key={child.tKey}
                item={child}
                collapsed={collapsed}
                isGroupOpen={false}
                onToggleGroup={onToggleGroup}
                onNavigate={onNavigate}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!item.href) return null;
  const active = isItemActive(item.href, pathname);

  if (collapsed) {
    return <RailLink href={item.href} icon={item.icon} label={label} active={active} onNavigate={onNavigate} />;
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-[var(--ob-radius-control)] px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[var(--ob-primary-soft)] font-medium text-[var(--ob-primary-light)]"
          : "text-[var(--ob-text-secondary)] hover:bg-[var(--ob-surface-high)] hover:text-[var(--ob-text)]",
        depth > 0 && "text-[13px]"
      )}
    >
      {/* Active state is carried by an accent bar *and* fill *and* weight —
          never colour alone, so it survives greyscale and low vision. */}
      {active && (
        <span
          className="absolute -start-2.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--ob-primary)]"
          aria-hidden="true"
        />
      )}
      <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** Collapsed-rail entry: icon only, with a CSS tooltip on hover/focus. */
function RailLink({
  href,
  icon: Icon,
  label,
  active,
  onNavigate,
}: {
  href: string;
  icon: NavItem["icon"];
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center justify-center rounded-[var(--ob-radius-control)] transition-colors",
        active
          ? "bg-[var(--ob-primary-soft)] text-[var(--ob-primary-light)]"
          : "text-[var(--ob-text-muted)] hover:bg-[var(--ob-surface-high)] hover:text-[var(--ob-text)]"
      )}
    >
      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      <span
        role="tooltip"
        className="pointer-events-none absolute start-full z-50 ms-2 hidden whitespace-nowrap rounded-[var(--ob-radius-control)] border border-[var(--ob-line-strong)] bg-[var(--ob-surface-high)] px-2 py-1 text-xs text-[var(--ob-text)] shadow-lg group-hover:block group-focus-visible:block"
      >
        {label}
      </span>
    </Link>
  );
}

/**
 * Persisted sidebar collapse preference.
 *
 * localStorage is an external store, so it is read through
 * useSyncExternalStore rather than copied into state inside an effect. That
 * gives the correct SSR value (always expanded — the server cannot know the
 * preference) without a post-mount setState, and keeps every mounted sidebar
 * in sync, including across browser tabs via the `storage` event.
 */
const collapseStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener(COLLAPSE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(COLLAPSE_EVENT, onChange);
    };
  },
  getSnapshot: () => localStorage.getItem(COLLAPSE_KEY) === "1",
  // The server has no preference to read; expanded is the safe default and
  // matches what the client renders before hydration completes.
  getServerSnapshot: () => false,
};

export function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const collapsed = useSyncExternalStore(
    collapseStore.subscribe,
    collapseStore.getSnapshot,
    collapseStore.getServerSnapshot
  );

  const set = useCallback((v: boolean) => {
    localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0");
    // `storage` only fires in *other* tabs, so notify this one explicitly.
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }, []);

  return [collapsed, set];
}
