"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import { Plus, MoreHorizontal, Trash2, CreditCard, RefreshCw } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "success", pending: "warning", expired: "destructive", suspended: "orange",
};

export default function SubscriptionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ playerId: "", planId: "", status: "pending", notes: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["subscriptions", page, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), perPage: "20" });
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      return fetch(`/api/subscriptions?${params}`).then((r) => r.json());
    },
  });

  const { data: plans } = useQuery({ queryKey: ["subscription-plans"], queryFn: () => fetch("/api/subscriptions/plans").then((r) => r.json()) });
  const { data: players } = useQuery({ queryKey: ["players-list"], queryFn: () => fetch("/api/players?perPage=200").then((r) => r.json()) });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/subscriptions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["subscriptions"] }); },
    onError: () => toast.error("Update failed"),
  });

  const addMutation = useMutation({
    mutationFn: () => fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addForm) }).then(async (r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => { toast.success("Subscription created"); qc.invalidateQueries({ queryKey: ["subscriptions"] }); setAddOpen(false); setAddForm({ playerId: "", planId: "", status: "pending", notes: "" }); },
    onError: () => toast.error("Create failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/subscriptions/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["subscriptions"] }); setDeleteId(null); },
    onError: () => toast.error("Delete failed"),
  });

  const getDaysRemaining = (sub: any) => {
    if (sub.status === "expired") return <span className="text-red-500 text-xs">Expired</span>;
    if (sub.status === "pending") return <span className="text-yellow-500 text-xs">Pending</span>;
    if (sub.status === "suspended") return <span className="text-orange-500 text-xs">Suspended</span>;
    if (!sub.endDate) return "—";
    const days = differenceInDays(parseISO(sub.endDate), new Date());
    if (days < 0) return <span className="text-red-500 text-xs">Expired</span>;
    if (days <= 7) return <span className="text-orange-500 text-xs font-medium">{days}d left</span>;
    return <span className="text-green-600 text-xs font-medium">{days}d left</span>;
  };

  const columns = [
    { key: "player", header: "Player", cell: (r: any) => <div><p className="font-medium text-sm">{r.player?.fullName}</p><p className="text-xs text-gray-400">{r.player?.phone ?? "—"}</p></div> },
    { key: "plan", header: "Plan", cell: (r: any) => (
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: r.plan?.color ?? "#6B7280" }} />
        <span className="text-sm">{r.plan?.name}</span>
      </div>
    )},
    { key: "startDate", header: "Start", cell: (r: any) => formatDate(r.startDate) },
    { key: "endDate", header: "End", cell: (r: any) => formatDate(r.endDate) },
    { key: "remaining", header: "Remaining", cell: (r: any) => getDaysRemaining(r) },
    { key: "status", header: "Status", cell: (r: any) => <Badge variant={STATUS_COLORS[r.status] as any}>{r.status}</Badge> },
    { key: "actions", header: "", cell: (r: any) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {r.status !== "active" && <DropdownMenuItem onClick={() => statusMutation.mutate({ id: r.id, status: "active" })}><RefreshCw className="me-2 h-3.5 w-3.5" />Activate</DropdownMenuItem>}
          {r.status === "active" && <DropdownMenuItem onClick={() => statusMutation.mutate({ id: r.id, status: "suspended" })}>Suspend</DropdownMenuItem>}
          {r.status === "active" && <DropdownMenuItem onClick={() => statusMutation.mutate({ id: r.id, status: "expired" })}>Mark Expired</DropdownMenuItem>}
          <DropdownMenuItem onClick={() => setDeleteId(r.id)} destructive><Trash2 className="me-2 h-3.5 w-3.5" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Subscriptions" description="Manage player subscriptions">
        <Button onClick={() => setAddOpen(true)}><Plus className="me-2 h-4 w-4" />Add Subscription</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No subscriptions found" emptyIcon={<CreditCard className="h-8 w-8" />} />
      {data?.totalPages > 1 && <Pagination page={page} totalPages={data.totalPages} total={data.total} perPage={20} onPageChange={setPage} />}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>Add Subscription</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Player *</label>
              <Select value={addForm.playerId} onValueChange={(v) => setAddForm({ ...addForm, playerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
                <SelectContent>{players?.data?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Plan *</label>
              <Select value={addForm.planId} onValueChange={(v) => setAddForm({ ...addForm, planId: v })}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>{plans?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.price} DA</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Initial Status</label>
              <Select value={addForm.status} onValueChange={(v) => setAddForm({ ...addForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active (start now)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} loading={addMutation.isPending} disabled={!addForm.playerId || !addForm.planId}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete Subscription" description="Are you sure you want to delete this subscription?" confirmLabel="Delete" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
