"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStation } from "@/context/StationContext";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-500",
  absent: "bg-red-500",
  late: "bg-yellow-500",
  "half-day": "bg-orange-400",
  "day-off": "bg-gray-300 dark:bg-gray-600",
  holiday: "bg-blue-400",
};
const STATUS_OPTIONS = ["present", "absent", "late", "half-day", "day-off", "holiday"];

export default function AttendancePage() {
  const { activeStationId } = useStation();
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [editing, setEditing] = useState<{ staffId: string; date: string } | null>(null);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const params = new URLSearchParams({ month: String(month), year: String(year), ...(activeStationId ? { stationId: activeStationId } : {}) });
  const { data: records = [] } = useQuery<any[]>({
    queryKey: ["attendance", activeStationId, month, year],
    queryFn: () => fetch(`/api/hrm/attendance?${params}`).then((r) => r.json()),
  });

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["hrm-staff", activeStationId],
    queryFn: () => fetch(`/api/hrm/staff${activeStationId ? `?stationId=${activeStationId}` : ""}`).then((r) => r.json()),
  });

  const markMut = useMutation({
    mutationFn: (data: any) => fetch("/api/hrm/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); setEditing(null); },
    onError: () => toast.error("Failed to save"),
  });

  const getRecord = (staffId: string, day: number) => {
    const date = new Date(year, month - 1, day);
    return records.find((r: any) => r.staffId === staffId && new Date(r.date).getDate() === day && new Date(r.date).getMonth() === month - 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Attendance</h1><p className="text-sm text-gray-500">Monthly attendance grid</p></div>
        <div className="flex items-center gap-2">
          <select className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString("en", { month: "long" })}</option>)}
          </select>
          <input type="number" className="w-24 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {STATUS_OPTIONS.map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-xs">
            <span className={`h-3 w-3 rounded-sm ${STATUS_COLORS[s]}`} />
            <span className="capitalize text-gray-600 dark:text-gray-400">{s}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-start py-2 pe-4 font-medium min-w-[140px]">Staff</th>
                {days.map((d) => (
                  <th key={d} className="w-8 text-center py-2 font-normal text-gray-400">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s: any) => (
                <tr key={s.id} className="border-t">
                  <td className="py-2 pe-4 font-medium whitespace-nowrap">{s.fullName}</td>
                  {days.map((d) => {
                    const rec = getRecord(s.id, d);
                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    return (
                      <td key={d} className="text-center p-0.5">
                        <div
                          className="relative group"
                          onClick={() => setEditing(editing?.staffId === s.id && editing?.date === dateStr ? null : { staffId: s.id, date: dateStr })}
                        >
                          <div className={`h-6 w-6 rounded cursor-pointer transition-opacity hover:opacity-80 mx-auto ${rec ? STATUS_COLORS[rec.status] : "bg-gray-100 dark:bg-gray-800"}`} />
                          {editing?.staffId === s.id && editing?.date === dateStr && (
                            <div className="absolute z-50 left-1/2 -translate-x-1/2 top-7 bg-white dark:bg-gray-900 border rounded-lg shadow-xl p-2 min-w-[120px]">
                              {STATUS_OPTIONS.map((st) => (
                                <button key={st} className="flex w-full items-center gap-2 px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 rounded capitalize"
                                  onClick={(e) => { e.stopPropagation(); markMut.mutate({ staffId: s.id, date: dateStr, status: st }); }}>
                                  <span className={`h-2.5 w-2.5 rounded-sm ${STATUS_COLORS[st]}`} />
                                  {st}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {!staff.length && <p className="py-8 text-center text-sm text-gray-400">No staff members found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
