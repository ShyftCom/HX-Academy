"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStation } from "@/context/StationContext";
import { Users, UserCheck, UserX, Calendar, Banknote, TrendingUp } from "lucide-react";
import Link from "next/link";

function formatDA(n: number) { return Number(n).toLocaleString("fr-DZ") + " DA"; }

export default function HRMDashboardPage() {
  const { activeStationId } = useStation();
  const params = activeStationId ? `?stationId=${activeStationId}` : "";

  const { data: stats } = useQuery({
    queryKey: ["hrm-dashboard", activeStationId],
    queryFn: () => fetch(`/api/hrm/dashboard${params}`).then((r) => r.json()),
  });

  const cards = [
    { label: "Total Staff", value: stats?.totalStaff ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Present Today", value: stats?.presentToday ?? 0, icon: UserCheck, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "Absent Today", value: stats?.absentToday ?? 0, icon: UserX, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
    { label: "On Leave", value: stats?.onLeave ?? 0, icon: Calendar, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Monthly Salary Cost", value: formatDA(stats?.monthlySalaryCost ?? 0), icon: Banknote, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "Attendance Rate", value: `${stats?.attendanceRate ?? 0}%`, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  ];

  const links = [
    { href: "/dashboard/hrm/staff", label: "Manage Staff", icon: Users },
    { href: "/dashboard/hrm/attendance", label: "Attendance", icon: Calendar },
    { href: "/dashboard/hrm/leave", label: "Leave Requests", icon: UserX },
    { href: "/dashboard/hrm/payroll", label: "Payroll", icon: Banknote },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR Management</h1>
        <p className="text-sm text-gray-500">Staff, attendance, leave, and payroll</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                </div>
                <div className={`rounded-lg p-2 ${c.bg}`}>
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {links.map((l) => (
          <Button key={l.href} variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
            <Link href={l.href}>
              <l.icon className="h-6 w-6" />
              <span>{l.label}</span>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
