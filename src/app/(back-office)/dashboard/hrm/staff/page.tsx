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
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useStation } from "@/context/StationContext";

function formatDA(n: number) { return Number(n).toLocaleString("fr-DZ") + " DA"; }

export default function StaffPage() {
  const { activeStationId } = useStation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ userId: "", fullName: "", role: "", phone: "", hireDate: "", baseSalary: "" });

  const params = activeStationId ? `?stationId=${activeStationId}` : "";
  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["hrm-staff", activeStationId],
    queryFn: () => fetch(`/api/hrm/staff${params}`).then((r) => r.json()),
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => fetch("/api/hrm/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      qc.invalidateQueries({ queryKey: ["hrm-staff"] });
      toast.success("Staff member added");
      setOpen(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Staff</h1><p className="text-sm text-gray-500">Manage your team</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="me-2 h-4 w-4" />Add Staff</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>User Account</Label>
                <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
                  <option value="">Select user...</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Full Name <span className="text-red-500">*</span></Label><Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Role</Label><Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="Coach, Manager..." /></div>
                <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Hire Date</Label><Input type="date" value={form.hireDate} onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Base Salary (DA)</Label><Input type="number" value={form.baseSalary} onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))} /></div>
              </div>
              <Button className="w-full" disabled={!form.userId || !form.fullName || createMut.isPending}
                onClick={() => createMut.mutate({ ...form, baseSalary: form.baseSalary ? Number(form.baseSalary) : null, stationId: activeStationId })}>
                {createMut.isPending ? "Adding..." : "Add Staff Member"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Staff List</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500">
              <th className="text-start py-2 pe-4">Name</th>
              <th className="text-start py-2 pe-4">Role</th>
              <th className="text-start py-2 pe-4">Station</th>
              <th className="text-start py-2 pe-4">Hire Date</th>
              <th className="text-end py-2 pe-4">Base Salary</th>
              <th className="text-center py-2 pe-4">Status</th>
              <th className="text-end py-2">Actions</th>
            </tr></thead>
            <tbody>
              {staff.map((s: any) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="py-3 pe-4 font-medium">{s.fullName}</td>
                  <td className="py-3 pe-4 text-gray-500">{s.role ?? "—"}</td>
                  <td className="py-3 pe-4 text-gray-500">{s.station?.name ?? "—"}</td>
                  <td className="py-3 pe-4 text-gray-500">{s.hireDate ? new Date(s.hireDate).toLocaleDateString("fr-DZ") : "—"}</td>
                  <td className="py-3 pe-4 text-end">{s.baseSalary ? formatDA(s.baseSalary) : "—"}</td>
                  <td className="py-3 pe-4 text-center"><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></td>
                  <td className="py-3 text-end"><Button variant="ghost" size="sm" asChild><Link href={`/dashboard/hrm/staff/${s.id}`}>View</Link></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!staff.length && <p className="py-8 text-center text-sm text-gray-400">No staff members yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
