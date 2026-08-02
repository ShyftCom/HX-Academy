"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Banknote, RefreshCw } from "lucide-react";
import { useStation } from "@/context/StationContext";
import { useTranslation } from "react-i18next";

function formatDA(n: number) { return Number(n).toLocaleString("fr-DZ") + " DA"; }

export default function PayrollPage() {
  const { t } = useTranslation("hrm");
  const { activeStationId } = useStation();
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bonuses, setBonuses] = useState<Record<string, string>>({});
  const [deductions, setDeductions] = useState<Record<string, string>>({});

  const params = new URLSearchParams({ month: String(month), year: String(year), ...(activeStationId ? { stationId: activeStationId } : {}) });
  const { data: payrolls = [], isLoading } = useQuery<any[]>({
    queryKey: ["payroll", activeStationId, month, year],
    queryFn: () => fetch(`/api/hrm/payroll?${params}`).then((r) => r.json()),
  });

  const generateMut = useMutation({
    mutationFn: () => fetch("/api/hrm/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stationId: activeStationId, month, year }) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); toast.success(t("payroll.generated")); },
    onError: () => toast.error(t("payroll.generate_failed")),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/hrm/payroll/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); setEditingId(null); toast.success(t("payroll.updated")); },
  });

  const payMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/hrm/payroll/${id}/pay`, { method: "POST" }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      qc.invalidateQueries({ queryKey: ["payroll"] });
      toast.success(t("payroll.paid"));
    },
  });

  const totalNet = payrolls.reduce((s: number, p: any) => s + Number(p.netSalary), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">{t("payroll.title")}</h1><p className="text-sm text-gray-500">{t("payroll.subtitle")}</p></div>
        <div className="flex items-center gap-2">
          <select className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString("en", { month: "long" })}</option>)}
          </select>
          <Input type="number" className="w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
            <RefreshCw className="me-2 h-4 w-4" />{generateMut.isPending ? "Generating..." : "Generate Payroll"}
          </Button>
        </div>
      </div>

      {payrolls.length > 0 && (
        <div className="text-sm text-gray-500">
          Total net salaries: <strong className="text-gray-900 dark:text-gray-100">{formatDA(totalNet)}</strong>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" />Payroll — {new Date(year, month - 1).toLocaleString("en", { month: "long" })} {year}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500">
              <th className="text-start py-2 pe-4">{t("staff.title")}</th>
              <th className="text-end py-2 pe-4">{t("staff.base_salary")}</th>
              <th className="text-end py-2 pe-4">{t("payroll.bonuses")}</th>
              <th className="text-end py-2 pe-4">{t("payroll.deductions")}</th>
              <th className="text-end py-2 pe-4">{t("payroll.absences")}</th>
              <th className="text-end py-2 pe-4">{t("payroll.net")}</th>
              <th className="text-center py-2 pe-4">{t("common:ui.status")}</th>
              <th className="text-end py-2">{t("common:ui.actions")}</th>
            </tr></thead>
            <tbody>
              {payrolls.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-3 pe-4 font-medium">{p.staff?.fullName}</td>
                  <td className="py-3 pe-4 text-end">{formatDA(p.baseSalary)}</td>
                  <td className="py-3 pe-4 text-end">
                    {editingId === p.id ? (
                      <Input type="number" className="w-28 h-7 text-xs text-end" value={bonuses[p.id] ?? String(p.bonuses)} onChange={(e) => setBonuses((b) => ({ ...b, [p.id]: e.target.value }))} />
                    ) : <span className="text-green-600">+{formatDA(p.bonuses)}</span>}
                  </td>
                  <td className="py-3 pe-4 text-end">
                    {editingId === p.id ? (
                      <Input type="number" className="w-28 h-7 text-xs text-end" value={deductions[p.id] ?? String(p.deductions)} onChange={(e) => setDeductions((d) => ({ ...d, [p.id]: e.target.value }))} />
                    ) : <span className="text-red-500">-{formatDA(p.deductions)}</span>}
                  </td>
                  <td className="py-3 pe-4 text-end text-red-400">-{formatDA(p.absencesDeduction)}</td>
                  <td className="py-3 pe-4 text-end font-semibold">{formatDA(p.netSalary)}</td>
                  <td className="py-3 pe-4 text-center"><Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge></td>
                  <td className="py-3 text-end">
                    <div className="flex justify-end gap-1">
                      {editingId === p.id ? (
                        <>
                          <Button size="sm" onClick={() => updateMut.mutate({ id: p.id, data: { bonuses: Number(bonuses[p.id] ?? p.bonuses), deductions: Number(deductions[p.id] ?? p.deductions) } })}>{t("common:actions.save")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>{t("common:ui.cancel")}</Button>
                        </>
                      ) : (
                        <>
                          {p.status !== "paid" && <Button size="sm" variant="outline" onClick={() => setEditingId(p.id)}>{t("common:ui.edit")}</Button>}
                          {p.status !== "paid" && <Button size="sm" onClick={() => { if (confirm(`Mark ${p.staff?.fullName}'s salary as paid?`)) payMut.mutate(p.id); }}>{t("payroll.pay")}</Button>}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && <p className="py-8 text-center text-sm text-gray-400">{t("common:ui.loading")}</p>}
          {!isLoading && !payrolls.length && <p className="py-8 text-center text-sm text-gray-400">{t("payroll.empty")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
