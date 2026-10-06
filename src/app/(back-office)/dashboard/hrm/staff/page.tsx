"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Users, RefreshCw, Shield } from "lucide-react";
import Link from "next/link";
import { useStation } from "@/context/StationContext";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permission-names";
import { generatePassword } from "@/lib/generate-password";

function formatDA(n: number) { return Number(n).toLocaleString("fr-DZ") + " DA"; }

export default function StaffPage() {
  const { t } = useTranslation("hrm");
  const { activeStationId } = useStation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const emptyForm = () => ({ fullName: "", email: "", password: generatePassword(), roleId: "", phone: "", hireDate: "", baseSalary: "" });
  const [form, setForm] = useState(emptyForm);
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.HRM_MANAGE);

  const params = activeStationId ? `?stationId=${activeStationId}` : "";
  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["hrm-staff", activeStationId],
    queryFn: () => fetch(`/api/hrm/staff${params}`).then((r) => r.json()),
  });

  // The access role decides which sidebar modules the new login can open.
  // Player is the portal role, never a staff role.
  const { data: roles = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["roles"],
    queryFn: () => fetch("/api/roles").then((r) => (r.ok ? r.json() : [])),
    enabled: canManage,
  });
  const staffRoles = roles.filter((r) => r.name !== "Player");

  const createMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/hrm/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? t("common:toast.failed"));
      return d;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm-staff"] });
      toast.success(t("staff.added"));
      setOpen(false);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = form.fullName.trim() && form.email.trim() && form.password.length >= 8 && form.roleId;
  const selectCls = "w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{t("staff.title")}</h1><p className="text-sm text-gray-500">{t("staff.subtitle")}</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          {canManage && <DialogTrigger asChild><Button><Plus className="me-2 h-4 w-4" />{t("staff.add")}</Button></DialogTrigger>}
          <DialogContent>
            <DialogHeader><DialogTitle>{t("staff.add_title")}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1"><Label>{t("staff.full_name")} <span className="text-red-500">*</span></Label><Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t("common:ui.email")} <span className="text-red-500">*</span></Label><Input type="email" autoComplete="off" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
                <div className="space-y-1">
                  <Label>{t("staff.password")} <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    <Input autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                    <Button type="button" variant="outline" size="icon" title={t("staff.generate_password")} aria-label={t("staff.generate_password")} onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}><RefreshCw className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>{t("staff.access_role")} <span className="text-red-500">*</span></Label>
                  {can(PERMISSIONS.ROLES_VIEW) && <Link href="/dashboard/hrm/roles" className="flex items-center gap-1 text-xs text-gray-500 hover:underline"><Shield className="h-3 w-3" />{t("staff.manage_roles")}</Link>}
                </div>
                <select className={selectCls} value={form.roleId} onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}>
                  <option value="">{t("staff.select_role")}</option>
                  {staffRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <p className="text-xs text-gray-500">{t("staff.access_role_hint")}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t("common:ui.phone")}</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
                <div className="space-y-1"><Label>{t("staff.hire_date")}</Label><Input type="date" value={form.hireDate} onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))} /></div>
                <div className="col-span-2 space-y-1"><Label>{t("staff.base_salary_da")}</Label><Input type="number" value={form.baseSalary} onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))} /></div>
              </div>
              <Button className="w-full" disabled={!canSubmit || createMut.isPending}
                onClick={() => createMut.mutate({ ...form, baseSalary: form.baseSalary ? Number(form.baseSalary) : null, stationId: activeStationId })}>
                {createMut.isPending ? t("common:bo.adding") : t("common:bo.hrm.add_staff")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{t("staff.list")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500">
              <th className="text-start py-2 pe-4">{t("common:ui.name")}</th>
              <th className="text-start py-2 pe-4">{t("staff.role")}</th>
              <th className="text-start py-2 pe-4">{t("staff.station")}</th>
              <th className="text-start py-2 pe-4">{t("staff.hire_date")}</th>
              <th className="text-end py-2 pe-4">{t("staff.base_salary")}</th>
              <th className="text-center py-2 pe-4">{t("common:ui.status")}</th>
              <th className="text-end py-2">{t("common:ui.actions")}</th>
            </tr></thead>
            <tbody>
              {staff.map((s: any) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="py-3 pe-4 font-medium">{s.fullName}</td>
                  <td className="py-3 pe-4 text-gray-500">{s.user?.role?.name ?? s.role ?? "—"}</td>
                  <td className="py-3 pe-4 text-gray-500">{s.station?.name ?? "—"}</td>
                  <td className="py-3 pe-4 text-gray-500">{s.hireDate ? new Date(s.hireDate).toLocaleDateString("fr-DZ") : "—"}</td>
                  <td className="py-3 pe-4 text-end">{s.baseSalary ? formatDA(s.baseSalary) : "—"}</td>
                  <td className="py-3 pe-4 text-center"><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></td>
                  <td className="py-3 text-end"><Button variant="ghost" size="sm" asChild><Link href={`/dashboard/hrm/staff/${s.id}`}>{t("common:ui.view")}</Link></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!staff.length && <p className="py-8 text-center text-sm text-gray-400">{t("staff.empty")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
