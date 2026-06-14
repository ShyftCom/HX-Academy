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
import { Plus, Calendar } from "lucide-react";
import { useStation } from "@/context/StationContext";

const LEAVE_TYPES = ["Annual", "Sick", "Unpaid", "Emergency", "Maternity"];
function formatDate(d: string) { return new Date(d).toLocaleDateString("fr-DZ"); }

export default function LeavePage() {
  const { activeStationId } = useStation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ staffId: "", leaveType: "Annual", startDate: "", endDate: "", reason: "" });

  const params = new URLSearchParams({ ...(activeStationId ? { stationId: activeStationId } : {}), ...(filter ? { status: filter } : {}) });
  const { data: leaves = [] } = useQuery<any[]>({
    queryKey: ["leaves", activeStationId, filter],
    queryFn: () => fetch(`/api/hrm/leave?${params}`).then((r) => r.json()),
  });

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["hrm-staff", activeStationId],
    queryFn: () => fetch(`/api/hrm/staff${activeStationId ? `?stationId=${activeStationId}` : ""}`).then((r) => r.json()),
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      fetch(`/api/hrm/leave/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leaves"] }); toast.success("Leave request updated"); },
  });

  const createMut = useMutation({
    mutationFn: (data: any) => fetch("/api/hrm/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leaves"] }); toast.success("Leave request created"); setOpen(false); },
  });

  const statusBadge = (s: string) => {
    const v = s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";
    return <Badge variant={v}>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Leave Requests</h1><p className="text-sm text-gray-500">Manage staff leave</p></div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {["pending", "approved", "rejected", ""].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-sm ${filter === s ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                {s || "All"}
              </button>
            ))}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="me-2 h-4 w-4" />Add Leave</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Leave Request</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label>Staff Member</Label>
                  <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" value={form.staffId} onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}>
                    <option value="">Select staff...</option>
                    {staff.map((s: any) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Leave Type</Label>
                  <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" value={form.leaveType} onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}>
                    {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
                </div>
                <div className="space-y-1"><Label>Reason</Label><Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></div>
                <Button className="w-full" disabled={!form.staffId || !form.startDate || !form.endDate || createMut.isPending} onClick={() => createMut.mutate(form)}>
                  {createMut.isPending ? "Creating..." : "Create Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          {leaves.map((l: any) => (
            <div key={l.id} className="flex items-start gap-4 rounded-lg border p-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{l.staff?.fullName}</p>
                  <Badge variant="outline">{l.leaveType}</Badge>
                  {statusBadge(l.status)}
                </div>
                <p className="text-sm text-gray-500 mt-1">{formatDate(l.startDate)} → {formatDate(l.endDate)} · {l.daysCount} day{l.daysCount !== 1 ? "s" : ""}</p>
                {l.reason && <p className="text-sm text-gray-400 mt-1">{l.reason}</p>}
              </div>
              {l.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => actionMut.mutate({ id: l.id, action: "approve" })}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => actionMut.mutate({ id: l.id, action: "reject" })}>Reject</Button>
                </div>
              )}
            </div>
          ))}
          {!leaves.length && <p className="py-8 text-center text-sm text-gray-400">No leave requests found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
