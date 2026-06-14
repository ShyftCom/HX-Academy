"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Users, TrendingUp, Globe } from "lucide-react";
import Link from "next/link";
import { useQuery as useGlobalQuery } from "@tanstack/react-query";

function formatDA(n: number) {
  return n.toLocaleString("fr-DZ") + " DA";
}

export default function StationsPage() {
  const { data: globalStats, isLoading } = useGlobalQuery({
    queryKey: ["global-stats"],
    queryFn: () => fetch("/api/stations/global-stats").then((r) => r.json()),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your academy locations</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/stations/new">
            <Plus className="me-2 h-4 w-4" />
            New Station
          </Link>
        </Button>
      </div>

      {/* Global summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Players</p>
            <p className="text-2xl font-bold">{globalStats?.totalPlayers ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold">{formatDA(globalStats?.totalRevenue ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Active Leads</p>
            <p className="text-2xl font-bold">{globalStats?.totalActiveLeads ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Meetings This Week</p>
            <p className="text-2xl font-bold">{globalStats?.totalMeetingsThisWeek ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Station comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Station Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-start py-2 pe-4">Station</th>
                    <th className="text-start py-2 pe-4">Wilaya</th>
                    <th className="text-end py-2 pe-4">Players</th>
                    <th className="text-end py-2 pe-4">Revenue</th>
                    <th className="text-end py-2 pe-4">Active Leads</th>
                    <th className="text-end py-2 pe-4">Conversion</th>
                    <th className="text-end py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(globalStats?.stations ?? []).map((s: any) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="py-3 pe-4 font-medium">{s.name}</td>
                      <td className="py-3 pe-4 text-gray-500">{s.wilaya}</td>
                      <td className="py-3 pe-4 text-end">
                        <span className="flex items-center justify-end gap-1">
                          <Users className="h-3.5 w-3.5 text-gray-400" />{s.players}
                        </span>
                      </td>
                      <td className="py-3 pe-4 text-end font-medium text-green-600">{formatDA(s.revenue)}</td>
                      <td className="py-3 pe-4 text-end">{s.leads}</td>
                      <td className="py-3 pe-4 text-end">
                        <Badge variant="secondary">{s.conversionRate}%</Badge>
                      </td>
                      <td className="py-3 text-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/stations/${s.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(globalStats?.stations?.length) && (
                <p className="py-8 text-center text-sm text-gray-400">No stations yet. Create your first one.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
