"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStation } from "@/context/StationContext";
import { TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permission-names";
import { PeriodFilter, periodParams, useSeason, type Period } from "@/components/finance/period-filter";
import { chargeCategoryLabel } from "@/lib/charge-labels";

function formatDA(n: number) { return Number(n).toLocaleString("fr-DZ") + " DA"; }

export default function FinancePage() {
  const { t } = useTranslation("finance");
  const { activeStationId } = useStation();
  // The shell renders this page while permissions load; don't ask for numbers
  // the route will refuse an Admin.
  const { can, isLoading: permsLoading } = usePermissions();
  const [period, setPeriod] = useState<Period>({ preset: "this_month", customFrom: "", customTo: "" });
  const { data: season, isLoading: seasonLoading } = useSeason();
  // One resolved range drives every card and chart below; null while a custom
  // range is incomplete, so nothing is fetched for half a range.
  const range = periodParams(period, season);

  const params = new URLSearchParams({ ...(range ?? {}), ...(activeStationId ? { stationId: activeStationId } : {}) });
  const { data: profit, isLoading } = useQuery({
    queryKey: ["finance-profit", activeStationId, range?.dateFrom ?? null, range?.dateTo ?? null],
    queryFn: () => fetch(`/api/finance/profit?${params}`).then((r) => r.json()),
    enabled: !permsLoading && can(PERMISSIONS.FINANCE_OVERVIEW) && range !== null && !(period.preset === "season" && seasonLoading),
  });
  // Recharts labels slices from `name`, so carry the translated label there.
  const byCategory = (profit?.byCategory ?? []).map((c: { name: string | null; color: string; amount: number }) => ({ ...c, name: chargeCategoryLabel(c.name, t) }));

  const metrics = [
    { label: t("common:bo.finance.gross_revenue"), value: profit?.grossRevenue ?? 0, color: "text-green-600", icon: TrendingUp },
    { label: t("common:bo.finance.total_charges"), value: profit?.totalCharges ?? 0, color: "text-red-500", icon: TrendingDown },
    { label: t("common:bo.finance.gross_profit"), value: profit?.grossProfit ?? 0, color: (profit?.grossProfit ?? 0) >= 0 ? "text-blue-600" : "text-red-600", icon: DollarSign },
    { label: t("common:bo.finance.salary_charges"), value: profit?.salaryCharges ?? 0, color: "text-amber-600", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-gray-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter value={period} onChange={setPeriod} />
          <Button variant="outline" size="sm" asChild><Link href="/dashboard/finance/charges">{t("manage_charges")}</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500">{m.label}</p>
                  <p className={`text-xl font-bold mt-1 ${m.color}`}>{formatDA(m.value)}</p>
                </div>
                <m.icon className={`h-5 w-5 ${m.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("daily_profit")}</CardTitle></CardHeader>
          <CardContent>
            {profit?.dailyTrend?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={profit.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatDA(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name={t("chart.revenue")} stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="charges" name={t("chart.charges")} stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit" name={t("chart.profit")} stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-gray-400">
                {isLoading ? t("common:bo.loading") : t("common:bo.finance.no_data")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("by_category")}</CardTitle></CardHeader>
          <CardContent>
            {byCategory.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={byCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {byCategory.map((entry: { color: string }, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatDA(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-gray-400">{t("no_charges_period")}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
