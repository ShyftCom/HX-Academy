"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from "recharts";
import { DollarSign, Users, CreditCard, ShoppingBag, TrendingUp, UserPlus, Calendar } from "lucide-react";

const PERIODS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
  { label: "Custom", value: "custom" },
];

const PIE_COLORS = ["#3B82F6", "#10B981", "#EF4444", "#F59E0B"];

export default function ReportsPage() {
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const buildParams = (type: string) => {
    const p = new URLSearchParams({ type, period });
    if (period === "custom" && startDate && endDate) { p.set("startDate", startDate); p.set("endDate", endDate); }
    return p.toString();
  };

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ["reports-overview", period, startDate, endDate],
    queryFn: () => fetch(`/api/reports?${buildParams("overview")}`).then((r) => r.json()),
  });

  const { data: revenue } = useQuery({
    queryKey: ["reports-revenue"],
    queryFn: () => fetch(`/api/reports?type=revenue`).then((r) => r.json()),
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["reports-subscriptions"],
    queryFn: () => fetch(`/api/reports?type=subscriptions`).then((r) => r.json()),
  });

  const { data: leads } = useQuery({
    queryKey: ["reports-leads", period, startDate, endDate],
    queryFn: () => fetch(`/api/reports?${buildParams("leads")}`).then((r) => r.json()),
  });

  const { data: products } = useQuery({
    queryKey: ["reports-products"],
    queryFn: () => fetch(`/api/reports?type=products`).then((r) => r.json()),
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Reports & Analytics" description="Track academy performance">
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
          {period === "custom" && (
            <>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
            </>
          )}
        </div>
      </PageHeader>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          {ovLoading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div> : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard title="Total Revenue" value={formatCurrency(overview?.totalRevenue ?? 0)} icon={DollarSign} iconColor="text-green-600" iconBg="bg-green-50 dark:bg-green-900/20" />
                <StatCard title="Period Revenue" value={formatCurrency(overview?.periodRevenue ?? 0)} icon={TrendingUp} iconColor="text-blue-600" iconBg="bg-blue-50 dark:bg-blue-900/20" />
                <StatCard title="Total Players" value={overview?.totalPlayers ?? 0} icon={Users} iconColor="text-purple-600" iconBg="bg-purple-50 dark:bg-purple-900/20" />
                <StatCard title="Active Subscriptions" value={overview?.activeSubscriptions ?? 0} icon={CreditCard} iconColor="text-indigo-600" iconBg="bg-indigo-50 dark:bg-indigo-900/20" />
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard title="Total Leads" value={overview?.totalLeads ?? 0} icon={UserPlus} iconColor="text-amber-600" iconBg="bg-amber-50 dark:bg-amber-900/20" />
                <StatCard title="Converted Leads" value={overview?.convertedLeads ?? 0} subtitle={`${overview?.conversionRate ?? 0}% rate`} icon={Users} iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-900/20" />
                <StatCard title="Total Orders" value={overview?.totalOrders ?? 0} icon={ShoppingBag} iconColor="text-rose-600" iconBg="bg-rose-50 dark:bg-rose-900/20" />
                <StatCard title="Pending Payments" value={overview?.pendingPayments ?? 0} icon={Calendar} iconColor="text-orange-600" iconBg="bg-orange-50 dark:bg-orange-900/20" />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="mt-5">
          <Card>
            <CardHeader><CardTitle>Monthly Revenue (Last 12 Months)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={revenue?.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: unknown) => [formatCurrency(Number(v)), "Revenue"]} />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-5">
          <Card>
            <CardHeader><CardTitle>Subscriptions by Status</CardTitle></CardHeader>
            <CardContent className="flex justify-center">
              {subscriptions?.data?.length ? (
                <PieChart width={400} height={300}>
                  <Pie data={subscriptions.data.map((d: any) => ({ name: d.status, value: d._count.status }))} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {subscriptions.data.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              ) : <p className="py-16 text-sm text-gray-400">No subscription data</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="mt-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard title="Total Leads" value={leads?.total ?? 0} icon={UserPlus} iconColor="text-blue-600" iconBg="bg-blue-50 dark:bg-blue-900/20" />
            <StatCard title="Converted" value={leads?.converted ?? 0} icon={Users} iconColor="text-green-600" iconBg="bg-green-50 dark:bg-green-900/20" />
            <StatCard title="Conversion Rate" value={`${leads?.conversionRate ?? 0}%`} icon={TrendingUp} iconColor="text-purple-600" iconBg="bg-purple-50 dark:bg-purple-900/20" />
            <StatCard title="Period Leads" value={leads?.thisMonth ?? 0} icon={Calendar} iconColor="text-amber-600" iconBg="bg-amber-50 dark:bg-amber-900/20" />
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-5">
          <Card>
            <CardHeader><CardTitle>Top Products by Sales</CardTitle></CardHeader>
            <CardContent>
              {products?.data?.length ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={products.data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="product" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="sales" fill="#10B981" radius={[0, 4, 4, 0]} name="Units Sold" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-16 text-center text-sm text-gray-400">No product sales data</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
