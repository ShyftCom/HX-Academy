"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, User, Calendar, DollarSign, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Attendance {
  id: string;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
  status: string;
}

interface Payroll {
  id: string;
  month: number;
  year: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  absencesDeduction: number;
  netSalary: number;
  status: string;
  paidAt?: string;
}

interface StaffDetail {
  id: string;
  fullName: string;
  role: string;
  phone?: string;
  nationalId?: string;
  hireDate?: string;
  baseSalary: number;
  salaryType: string;
  bankAccount?: string;
  status: string;
  user?: { email?: string };
  attendances: Attendance[];
  leaveRequests: LeaveRequest[];
  payrolls: Payroll[];
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const statusColors: Record<string, string> = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
  late: "bg-yellow-100 text-yellow-800",
  half_day: "bg-orange-100 text-orange-800",
  day_off: "bg-gray-100 text-gray-700",
  holiday: "bg-blue-100 text-blue-800",
};

const leaveStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [leaveActionId, setLeaveActionId] = useState<string | null>(null);

  const { data: staff, isLoading } = useQuery<StaffDetail>({
    queryKey: ["hrm-staff", id],
    queryFn: () => fetch(`/api/hrm/staff/${id}`).then((r) => r.json()),
  });

  const leaveActionMutation = useMutation({
    mutationFn: ({ leaveId, action }: { leaveId: string; action: "approved" | "rejected" }) =>
      fetch(`/api/hrm/leave/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Leave request updated");
      qc.invalidateQueries({ queryKey: ["hrm-staff", id] });
      setLeaveActionId(null);
    },
    onError: () => toast.error("Failed to update leave request"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-6 text-center text-red-500">Staff member not found.</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {staff.fullName}
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-sm">{staff.role}</p>
        </div>
        <div className="ml-auto">
          <Badge className={staff.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}>
            {staff.status}
          </Badge>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Email</span>
            </div>
            <p className="text-sm font-medium truncate">{staff.user?.email ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Hire Date</span>
            </div>
            <p className="text-sm font-medium">
              {staff.hireDate ? new Date(staff.hireDate).toLocaleDateString() : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Base Salary</span>
            </div>
            <p className="text-sm font-medium">{Number(staff.baseSalary).toLocaleString()} DA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">National ID</span>
            </div>
            <p className="text-sm font-medium">{staff.nationalId ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">
            Attendance ({staff.attendances.length})
          </TabsTrigger>
          <TabsTrigger value="leave">
            Leave ({staff.leaveRequests.length})
          </TabsTrigger>
          <TabsTrigger value="payroll">
            Payroll ({staff.payrolls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              {staff.attendances.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No attendance records</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {staff.attendances
                    .slice()
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm">{new Date(a.date).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          {a.checkIn && <span className="text-xs text-muted-foreground">In: {a.checkIn}</span>}
                          {a.checkOut && <span className="text-xs text-muted-foreground">Out: {a.checkOut}</span>}
                          <Badge className={`text-xs ${statusColors[a.status] ?? "bg-gray-100"}`}>
                            {a.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {staff.leaveRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No leave requests</p>
              ) : (
                <div className="space-y-3">
                  {staff.leaveRequests
                    .slice()
                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                    .map((lr) => (
                      <div key={lr.id} className="flex items-start justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium capitalize">
                              {lr.leaveType.replace("_", " ")}
                            </span>
                            <Badge className={`text-xs ${leaveStatusColors[lr.status] ?? "bg-gray-100"}`}>
                              {lr.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(lr.startDate).toLocaleDateString()} – {new Date(lr.endDate).toLocaleDateString()}
                            {" "}({lr.daysCount} day{lr.daysCount !== 1 ? "s" : ""})
                          </p>
                          {lr.reason && <p className="text-xs text-muted-foreground mt-1">{lr.reason}</p>}
                        </div>
                        {lr.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              disabled={leaveActionMutation.isPending && leaveActionId === lr.id}
                              onClick={() => {
                                setLeaveActionId(lr.id);
                                leaveActionMutation.mutate({ leaveId: lr.id, action: "approved" });
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              disabled={leaveActionMutation.isPending && leaveActionId === lr.id}
                              onClick={() => {
                                setLeaveActionId(lr.id);
                                leaveActionMutation.mutate({ leaveId: lr.id, action: "rejected" });
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payroll History</CardTitle>
            </CardHeader>
            <CardContent>
              {staff.payrolls.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No payroll records</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-muted-foreground font-medium">Period</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Base</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Bonuses</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Deductions</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Net</th>
                        <th className="text-center py-2 text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.payrolls
                        .slice()
                        .sort((a, b) => b.year - a.year || b.month - a.month)
                        .map((p) => (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="py-2">
                              {MONTH_NAMES[p.month - 1]} {p.year}
                            </td>
                            <td className="py-2 text-right">{Number(p.baseSalary).toLocaleString()} DA</td>
                            <td className="py-2 text-right text-green-600">
                              +{Number(p.bonuses).toLocaleString()} DA
                            </td>
                            <td className="py-2 text-right text-red-500">
                              -{(Number(p.deductions) + Number(p.absencesDeduction)).toLocaleString()} DA
                            </td>
                            <td className="py-2 text-right font-semibold">
                              {Number(p.netSalary).toLocaleString()} DA
                            </td>
                            <td className="py-2 text-center">
                              <Badge className={p.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                              }>
                                {p.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
