"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStation } from "@/context/StationContext";
import { TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import Link from "next/link";

function formatDA(n: number) { return Number(n).toLocaleString("fr-DZ") + " DA"; }

export default function FinancePage() {
  const { activeStationId } = useStation();
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(now.toISOString().split("T")[0]);

  const params = new URLSearchParams({ dateFrom, dateTo, ...(activeStationId ? { stationId: activeStationId } : {}) });
  const { data: profit, isLoading } = useQuery({
    queryKey: ["finance-profit", activeStationId, dateFrom, dateTo],
    queryFn: () => fetch(`/api/finance/profit?${params}`).then((r) => r.json()),
  });

  const metrics = [
    { label: "Gross Revenue", value: profit?.grossRevenue ?? 0, color: "text-green-600", icon: TrendingUp },
    { label: "Total Charges", value: profit?.totalCharges ?? 0, color: "text-red-500", icon: TrendingDown },
    { label: "Gross Profit", value: profit?.grossProfit ?? 0, color: (profit?.grossProfit ?? 0) >= 0 ? "text-blue-600" : "text-red-600", icon: DollarSign },
    { label: "Salary Charges", value: profit?.salaryCharges ?? 0, color: "text-amber-600", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Finance Overview</h1>
          <p className="text-sm text-gray-500">Profit and expense analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" className="w-36 h-9" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-gray-400">—</span>
          <Input type="date" className="w-36 h-9" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Button variant="outline" size="sm" asChild><Link href="/dashboard/finance/charges">Manage Charges</Link></Button>
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
          <CardHeader><CardTitle>Daily Profit Trend</CardTitle></CardHeader>
          <CardContent>
            {profit?.dailyTrend?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={profit.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatDA(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="charges" name="Charges" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-gray-400">
                {isLoading ? "Loading..." : "No data for selected period"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Charges by Category</CardTitle></CardHeader>
          <CardContent>
            {profit?.byCategory?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={profit.byCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {profit.byCategory.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatDA(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-gray-400">No charges in this period</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
