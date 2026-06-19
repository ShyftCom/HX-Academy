"use client";

import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import {
  Users, CreditCard, DollarSign, ShoppingBag, Bell, TrendingUp,
  AlertTriangle, CheckCircle, Clock, UserPlus,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { FullPageLoader } from "@/components/shared/loading-spinner";
import Link from "next/link";
import { useStation } from "@/context/StationContext";

export default function DashboardPage() {
  const { activeStationId } = useStation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", activeStationId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (activeStationId) p.set("stationId", activeStationId);
      return fetch(`/api/dashboard/stats?${p}`).then((r) => r.json());
    },
    refetchInterval: 60000,
  });

  const { data: revenueData } = useQuery({
    queryKey: ["reports-revenue"],
    queryFn: () => fetch("/api/reports?type=revenue&period=year").then((r) => r.json()),
  });

  if (isLoading) return <FullPageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Academy overview and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Players"
          value={stats?.totalPlayers ?? 0}
          subtitle={`${stats?.activePlayers ?? 0} active`}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          title="Active Subscriptions"
          value={stats?.activeSubscriptions ?? 0}
          subtitle={`${stats?.expiringSubscriptions ?? 0} expiring soon`}
          icon={CreditCard}
          iconColor="text-green-600"
          iconBg="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.monthRevenue ?? 0)}
          subtitle="This month"
          icon={DollarSign}
          iconColor="text-purple-600"
          iconBg="bg-purple-50 dark:bg-purple-900/20"
          trend={stats?.revenueGrowth !== undefined ? { value: stats.revenueGrowth, label: "vs last month" } : undefined}
        />
        <StatCard
          title="Pending Payments"
          value={stats?.pendingPayments ?? 0}
          subtitle="Awaiting review"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="New Leads (Month)"
          value={stats?.newLeads ?? 0}
          icon={UserPlus}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          title="Pending Orders"
          value={stats?.pendingOrders ?? 0}
          icon={ShoppingBag}
          iconColor="text-rose-600"
          iconBg="bg-rose-50 dark:bg-rose-900/20"
        />
      </div>

      {/* Revenue Chart + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData?.data?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueData.data}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                  <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentActivity?.length ? (
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 8).map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                      <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{log.description}</p>
                      <p className="text-xs text-gray-400">{timeAgo(log.createdAt)} · {log.user?.name ?? "System"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-gray-400 text-sm">No activity yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {stats?.pendingPayments > 0 || stats?.expiringSubscriptions > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.pendingPayments > 0 && (
                <Link href="/dashboard/payments?status=pending" className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 transition-colors">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                      {stats.pendingPayments} payment{stats.pendingPayments > 1 ? "s" : ""} awaiting review
                    </p>
                    <p className="text-xs text-amber-600">Click to review</p>
                  </div>
                </Link>
              )}
              {stats?.expiringSubscriptions > 0 && (
                <Link href="/dashboard/subscriptions?status=active" className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 transition-colors">
                  <Bell className="h-5 w-5 text-orange-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-400">
                      {stats.expiringSubscriptions} subscription{stats.expiringSubscriptions > 1 ? "s" : ""} expiring in 7 days
                    </p>
                    <p className="text-xs text-orange-600">Click to review</p>
                  </div>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
