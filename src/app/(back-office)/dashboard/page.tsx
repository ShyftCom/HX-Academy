"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, Bell, CheckCircle2, ClipboardList, Clock, CreditCard,
  Receipt, ShoppingBag, TrendingUp, UserPlus, Users,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { MetricCardSkeleton, ListSkeleton } from "@/components/shared/skeleton";
import { ChartCard, ChartTooltip, axisProps, gridProps } from "@/components/shared/chart-card";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStation } from "@/context/StationContext";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permission-names";
import * as fmt from "@/lib/format";
import { brand } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalPlayers: number;
  activePlayers: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
  pendingPayments: number;
  totalRevenue: number;
  monthRevenue: number;
  revenueGrowth: number;
  newLeads: number;
  pendingOrders: number;
  recentActivity: Array<{
    id: string;
    description: string;
    createdAt: string;
    user?: { name: string | null } | null;
  }>;
}

interface RevenuePoint {
  month: string;
  revenue: number;
}

export default function DashboardPage() {
  const { t } = useTranslation("common");
  const { activeStationId } = useStation();
  const { can } = usePermissions();

  const statsQuery = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", activeStationId],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (activeStationId) p.set("stationId", activeStationId);
      const res = await fetch(`/api/dashboard/stats?${p}`);
      if (!res.ok) throw new Error("stats");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const revenueQuery = useQuery<{ data: RevenuePoint[] }>({
    queryKey: ["reports-revenue"],
    queryFn: async () => {
      const res = await fetch("/api/reports?type=revenue&period=year");
      if (!res.ok) throw new Error("revenue");
      return res.json();
    },
    // Only fetched for users who may see reporting — the endpoint would refuse
    // anyway, but there's no reason to make the request and log a rejection.
    enabled: can(PERMISSIONS.REPORTS_VIEW),
  });

  const stats = statsQuery.data;
  const loading = statsQuery.isLoading;

  if (statsQuery.isError) {
    return (
      <>
        <PageHeader title={t("dashboard.title")} description={t("dashboard.subtitle")} />
        <ErrorState onRetry={() => statsQuery.refetch()} />
      </>
    );
  }

  const revenueSeries = revenueQuery.data?.data ?? [];
  const hasRevenue = revenueSeries.some((p) => p.revenue > 0);

  const actionable =
    (stats?.pendingPayments ?? 0) > 0 || (stats?.expiringSubscriptions ?? 0) > 0;

  return (
    <>
      <PageHeader title={t("dashboard.title")} description={t("dashboard.subtitle")} />

      {/* Primary metrics — one uniform grid instead of the previous 4-then-3
          split, which made the second row's cards read as less important than
          they are. Two columns on tablet, four on desktop. */}
      <section aria-label={t("dashboard.title")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              title={t("dashboard.total_players")}
              value={fmt.number(stats?.totalPlayers ?? 0)}
              subtitle={t("dashboard.active_players", { count: stats?.activePlayers ?? 0 })}
              icon={Users}
              href={can(PERMISSIONS.PLAYERS_VIEW) ? "/dashboard/players" : undefined}
            />
            <MetricCard
              title={t("dashboard.active_subscriptions")}
              value={fmt.number(stats?.activeSubscriptions ?? 0)}
              subtitle={t("dashboard.expiring_soon", { count: stats?.expiringSubscriptions ?? 0 })}
              icon={CreditCard}
              href={can(PERMISSIONS.SUBS_VIEW) ? "/dashboard/subscriptions" : undefined}
            />
            <MetricCard
              title={t("dashboard.monthly_revenue")}
              value={fmt.currency(stats?.monthRevenue ?? 0)}
              subtitle={t("dashboard.this_month")}
              icon={TrendingUp}
              trend={
                stats?.revenueGrowth !== undefined
                  ? { value: stats.revenueGrowth, label: t("dashboard.vs_last_month") }
                  : undefined
              }
              featured
            />
            <MetricCard
              title={t("dashboard.pending_payments")}
              value={fmt.number(stats?.pendingPayments ?? 0)}
              subtitle={t("dashboard.awaiting_review")}
              icon={Clock}
              href={can(PERMISSIONS.PAYMENTS_VIEW) ? "/dashboard/payments?status=pending" : undefined}
            />
          </>
        )}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              title={t("dashboard.new_leads")}
              value={fmt.number(stats?.newLeads ?? 0)}
              icon={UserPlus}
              href={can(PERMISSIONS.LEADS_VIEW) ? "/dashboard/leads" : undefined}
            />
            <MetricCard
              title={t("dashboard.total_revenue")}
              value={fmt.currency(stats?.totalRevenue ?? 0)}
              icon={Receipt}
            />
            <MetricCard
              title={t("dashboard.pending_orders")}
              value={fmt.number(stats?.pendingOrders ?? 0)}
              icon={ShoppingBag}
              href={can(PERMISSIONS.ORDERS_VIEW) ? "/dashboard/orders" : undefined}
            />
          </>
        )}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {can(PERMISSIONS.REPORTS_VIEW) && (
          <ChartCard
            className="lg:col-span-3"
            title={t("dashboard.revenue_chart")}
            loading={revenueQuery.isLoading}
            isEmpty={!hasRevenue}
            emptyMessage={t("dashboard.no_revenue_data")}
            height={280}
            summary={buildChartSummary(revenueSeries, t("dashboard.revenue_chart"))}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="obRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={brand.primary} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={brand.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} minTickGap={24} />
                <YAxis
                  {...axisProps}
                  width={56}
                  // Compact + unit, so the axis is never an unlabelled number.
                  tickFormatter={(v: number) => fmt.currencyCompact(v)}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(229,226,225,0.14)" }}
                  content={<ChartTooltip formatter={(v) => fmt.currency(Number(v))} />}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name={t("dashboard.monthly_revenue")}
                  stroke={brand.primary}
                  strokeWidth={2}
                  fill="url(#obRevenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <Card className={cn("flex flex-col", can(PERMISSIONS.REPORTS_VIEW) ? "lg:col-span-2" : "lg:col-span-5")}>
          <CardHeader>
            <CardTitle>{t("dashboard.recent_activity")}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            {loading ? (
              <ListSkeleton rows={6} />
            ) : stats?.recentActivity?.length ? (
              // Loosened from the previous space-y-3: the feed was the densest
              // block on the page and read as a wall of text.
              <ol className="flex flex-col gap-4">
                {stats.recentActivity.slice(0, 7).map((log) => (
                  <li key={log.id} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--ob-line)] bg-[var(--ob-surface)]"
                      aria-hidden="true"
                    >
                      <CheckCircle2 className="h-3 w-3 text-[var(--ob-primary-light)]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-[var(--ob-text-secondary)]">
                        {log.description}
                      </p>
                      <p className="ob-mono mt-1 truncate uppercase text-[var(--ob-text-muted)]">
                        {fmt.relativeTime(log.createdAt)} · {log.user?.name ?? t("dashboard.system")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={Bell} title={t("dashboard.no_activity")} size="compact" />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Action Required. Rendered even when empty — a persistent slot that
          reads "all clear" is more trustworthy than one that silently vanishes,
          because the user can tell the difference between "nothing to do" and
          "the panel failed to load". */}
      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.action_required")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <ListSkeleton rows={2} />
            ) : actionable ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(stats?.pendingPayments ?? 0) > 0 && (
                  <ActionRow
                    href="/dashboard/payments?status=pending"
                    icon={AlertTriangle}
                    tone="warning"
                    title={t("dashboard.payments_awaiting", { count: stats!.pendingPayments })}
                    hint={t("dashboard.click_to_review")}
                  />
                )}
                {(stats?.expiringSubscriptions ?? 0) > 0 && (
                  <ActionRow
                    href="/dashboard/subscriptions?status=active"
                    icon={ClipboardList}
                    tone="info"
                    title={t("dashboard.subs_expiring", { count: stats!.expiringSubscriptions })}
                    hint={t("dashboard.click_to_review")}
                  />
                )}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title={t("dashboard.all_clear")}
                description={t("dashboard.all_clear_body")}
                size="compact"
              />
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function ActionRow({
  href, icon: Icon, tone, title, hint,
}: {
  href: string;
  icon: typeof AlertTriangle;
  tone: "warning" | "info";
  title: string;
  hint: string;
}) {
  const toneClass =
    tone === "warning"
      ? "border-[rgba(245,181,68,0.3)] bg-[var(--ob-warning-soft)] text-[var(--ob-warning)]"
      : "border-[rgba(0,112,243,0.3)] bg-[var(--ob-primary-soft)] text-[var(--ob-primary-light)]";

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[var(--ob-radius-container)] border border-[var(--ob-line)] bg-[var(--ob-surface)] p-3.5 transition-colors hover:border-[var(--ob-line-strong)] hover:bg-[var(--ob-surface-high)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ob-primary)]"
    >
      <span
        className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ob-radius-control)] border", toneClass)}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-[var(--ob-text)]">{title}</span>
        <span className="ob-mono mt-0.5 block uppercase text-[var(--ob-text-muted)]">{hint}</span>
      </span>
    </Link>
  );
}

/**
 * Plain-language equivalent of the revenue chart for screen readers.
 * An <svg> of paths conveys nothing without it.
 */
function buildChartSummary(series: RevenuePoint[], title: string): string {
  if (!series.length) return title;
  const total = series.reduce((sum, p) => sum + p.revenue, 0);
  const peak = series.reduce((best, p) => (p.revenue > best.revenue ? p : best), series[0]);
  return `${title}. Total ${fmt.currency(total)} across ${series.length} months. Highest: ${peak.month} at ${fmt.currency(peak.revenue)}.`;
}
