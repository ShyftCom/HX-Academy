"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { Plus, MoreHorizontal, Edit, Trash2, Eye, UserCheck, UserX, Users, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStation } from "@/context/StationContext";

const CATEGORIES = ["U8", "U10", "U12", "U14", "U16", "U18", "Adult"];
const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward", "Winger"];

const schema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  category: z.string().optional(),
  team: z.string().optional(),
  position: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  medicalNotes: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function PlayersPage() {
  const qc = useQueryClient();
  const { activeStationId } = useStation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState<any>(null);
  const [viewPlayer, setViewPlayer] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetPwdPlayer, setResetPwdPlayer] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["players", page, search, statusFilter, categoryFilter, activeStationId],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), perPage: "20" });
      if (search) params.set("q", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (activeStationId) params.set("stationId", activeStationId);
      return fetch(`/api/players?${params}`).then((r) => r.json());
    },
  });

  const { data: playerDetail } = useQuery({
    queryKey: ["player", viewPlayer?.id],
    queryFn: () => fetch(`/api/players/${viewPlayer.id}`).then((r) => r.json()),
    enabled: !!viewPlayer?.id,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const url = editPlayer ? `/api/players/${editPlayer.id}` : "/api/players";
      const res = await fetch(url, { method: editPlayer ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => { toast.success(editPlayer ? "Player updated" : "Player created"); qc.invalidateQueries({ queryKey: ["players"] }); setModalOpen(false); reset(); setEditPlayer(null); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/players/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Player status updated"); qc.invalidateQueries({ queryKey: ["players"] }); },
    onError: () => toast.error("Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/players/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Player deleted"); qc.invalidateQueries({ queryKey: ["players"] }); setDeleteId(null); },
    onError: () => toast.error("Delete failed"),
  });

  const resetPwdMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(`/api/players/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => { toast.success("Password updated"); setResetPwdPlayer(null); setNewPassword(""); setConfirmPassword(""); },
    onError: (e: any) => toast.error(e.message ?? "Failed to update password"),
  });

  const openAdd = () => { setEditPlayer(null); reset({ fullName: "", email: "", phone: "" }); setModalOpen(true); };
  const openEdit = (p: any) => {
    setEditPlayer(p);
    reset({ fullName: p.fullName, email: p.email ?? "", phone: p.phone ?? "", dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split("T")[0] : "", gender: p.gender ?? "", category: p.category ?? "", team: p.team ?? "", position: p.position ?? "", parentName: p.parentName ?? "", parentPhone: p.parentPhone ?? "", address: p.address ?? "", emergencyContact: p.emergencyContact ?? "", medicalNotes: p.medicalNotes ?? "", notes: p.notes ?? "" });
    setModalOpen(true);
  };

  const getSubStatus = (p: any) => {
    const sub = p.subscriptions?.[0];
    if (!sub) return <Badge variant="secondary">No Plan</Badge>;
    if (sub.status === "active") return <Badge variant="success">Active</Badge>;
    if (sub.status === "expired") return <Badge variant="destructive">Expired</Badge>;
    return <Badge variant="warning">{sub.status}</Badge>;
  };

  const columns = [
    { key: "name", header: "Player", cell: (r: any) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8"><AvatarImage src={r.photo ?? ""} /><AvatarFallback>{getInitials(r.fullName)}</AvatarFallback></Avatar>
        <div><p className="font-medium text-sm">{r.fullName}</p><p className="text-xs text-gray-400">{r.email ?? "—"}</p></div>
      </div>
    )},
    { key: "phone", header: "Phone", cell: (r: any) => r.phone ?? "—" },
    { key: "category", header: "Category", cell: (r: any) => r.category ? <Badge variant="outline">{r.category}</Badge> : "—" },
    { key: "team", header: "Team", cell: (r: any) => r.team ?? "—" },
    { key: "subscription", header: "Subscription", cell: (r: any) => getSubStatus(r) },
    { key: "status", header: "Status", cell: (r: any) => (
      <Badge variant={r.status === "active" ? "success" : "destructive"}>{r.status}</Badge>
    )},
    { key: "actions", header: "", cell: (r: any) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewPlayer(r)}><Eye className="me-2 h-4 w-4" />View Details</DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="me-2 h-4 w-4" />Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          {r.status === "active"
            ? <DropdownMenuItem onClick={() => statusMutation.mutate({ id: r.id, status: "suspended" })}><UserX className="me-2 h-4 w-4" />Suspend</DropdownMenuItem>
            : <DropdownMenuItem onClick={() => statusMutation.mutate({ id: r.id, status: "active" })}><UserCheck className="me-2 h-4 w-4" />Activate</DropdownMenuItem>
          }
          <DropdownMenuItem onClick={() => { setResetPwdPlayer(r); setNewPassword(""); setConfirmPassword(""); }}><KeyRound className="me-2 h-4 w-4" />Reset Password</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDeleteId(r.id)} destructive><Trash2 className="me-2 h-4 w-4" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Players" description="Manage all academy players">
        <Button onClick={openAdd}><Plus className="me-2 h-4 w-4" />Add Player</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search players..." className="w-64" />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No players found" emptyIcon={<Users className="h-8 w-8" />} />
      {data?.totalPages > 1 && <Pagination page={page} totalPages={data.totalPages} total={data.total} perPage={20} onPageChange={setPage} />}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="2xl">
          <DialogHeader><DialogTitle>{editPlayer ? "Edit Player" : "Add New Player"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
            <DialogBody className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              <Input {...register("fullName")} label="Full Name *" placeholder="John Doe" error={errors.fullName?.message} />
              <Input {...register("email")} label="Email *" placeholder="player@example.com" error={errors.email?.message} />
              <Input {...register("phone")} label="Phone" placeholder="+213 ..." />
              <Input {...register("dateOfBirth")} label="Date of Birth" type="date" />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
                <Select onValueChange={(v) => setValue("gender", v)} defaultValue={editPlayer?.gender ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <Select onValueChange={(v) => setValue("category", v)} defaultValue={editPlayer?.category ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input {...register("team")} label="Team" placeholder="Team A" />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                <Select onValueChange={(v) => setValue("position", v)} defaultValue={editPlayer?.position ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>{POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input {...register("parentName")} label="Parent Name" placeholder="Parent full name" />
              <Input {...register("parentPhone")} label="Parent Phone" placeholder="+213 ..." />
              <Input {...register("address")} label="Address" placeholder="City, Region" className="col-span-2" />
              <Input {...register("emergencyContact")} label="Emergency Contact" placeholder="Name & Phone" className="col-span-2" />
              <Textarea {...register("medicalNotes")} label="Medical Notes" placeholder="Any medical conditions..." className="col-span-2" rows={2} />
              <Textarea {...register("notes")} label="Notes" placeholder="Additional notes..." className="col-span-2" rows={2} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={saveMutation.isPending}>{editPlayer ? "Save Changes" : "Create Player"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Player Detail Modal */}
      <Dialog open={!!viewPlayer} onOpenChange={(o) => !o && setViewPlayer(null)}>
        <DialogContent size="2xl">
          <DialogHeader>
            <DialogTitle>{viewPlayer?.fullName} — Details</DialogTitle>
          </DialogHeader>
          <DialogBody className="max-h-[65vh] overflow-y-auto">
            {playerDetail ? (
              <Tabs defaultValue="info">
                <TabsList className="mb-4">
                  <TabsTrigger value="info">Profile</TabsTrigger>
                  <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                </TabsList>
                <TabsContent value="info">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[["Email", playerDetail.email],["Phone",playerDetail.phone],["Category",playerDetail.category],["Team",playerDetail.team],["Position",playerDetail.position],["Parent",playerDetail.parentName],["Parent Phone",playerDetail.parentPhone],["Address",playerDetail.address],["Emergency",playerDetail.emergencyContact],["Medical",playerDetail.medicalNotes],["Notes",playerDetail.notes]].map(([k,v]) => v ? (
                      <div key={k}><p className="text-xs text-gray-400">{k}</p><p className="font-medium">{v}</p></div>
                    ) : null)}
                  </div>
                </TabsContent>
                <TabsContent value="subscriptions">
                  <div className="space-y-2">
                    {playerDetail.subscriptions?.length ? playerDetail.subscriptions.map((s: any) => (
                      <div key={s.id} className="rounded-lg border p-3 flex items-center justify-between dark:border-gray-700">
                        <div><p className="font-medium text-sm">{s.plan?.name}</p><p className="text-xs text-gray-400">{formatDate(s.startDate)} → {formatDate(s.endDate)}</p></div>
                        <Badge variant={s.status === "active" ? "success" : s.status === "expired" ? "destructive" : "secondary"}>{s.status}</Badge>
                      </div>
                    )) : <p className="text-sm text-gray-400">No subscriptions</p>}
                  </div>
                </TabsContent>
                <TabsContent value="payments">
                  <div className="space-y-2">
                    {playerDetail.payments?.length ? playerDetail.payments.map((p: any) => (
                      <div key={p.id} className="rounded-lg border p-3 flex items-center justify-between dark:border-gray-700">
                        <div><p className="font-medium text-sm">{formatCurrency(p.amount)}</p><p className="text-xs text-gray-400">{p.plan?.name} · {formatDate(p.createdAt)}</p></div>
                        <Badge variant={p.status === "approved" ? "success" : p.status === "rejected" ? "destructive" : "warning"}>{p.status}</Badge>
                      </div>
                    )) : <p className="text-sm text-gray-400">No payments</p>}
                  </div>
                </TabsContent>
                <TabsContent value="orders">
                  <div className="space-y-2">
                    {playerDetail.orders?.length ? playerDetail.orders.map((o: any) => (
                      <div key={o.id} className="rounded-lg border p-3 flex items-center justify-between dark:border-gray-700">
                        <div><p className="font-medium text-sm">#{o.orderNumber}</p><p className="text-xs text-gray-400">{o.items?.length} items · {formatDate(o.createdAt)}</p></div>
                        <span className="text-sm font-medium">{formatCurrency(o.totalAmount)}</span>
                      </div>
                    )) : <p className="text-sm text-gray-400">No orders</p>}
                  </div>
                </TabsContent>
              </Tabs>
            ) : <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete Player" description="This will permanently delete the player and their account. This cannot be undone." confirmLabel="Delete" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPwdPlayer} onOpenChange={(o) => { if (!o) { setResetPwdPlayer(null); setNewPassword(""); setConfirmPassword(""); } }}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Reset Password — {resetPwdPlayer?.fullName}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPwdPlayer(null); setNewPassword(""); setConfirmPassword(""); }}>Cancel</Button>
            <Button
              loading={resetPwdMutation.isPending}
              disabled={!newPassword || newPassword !== confirmPassword || newPassword.length < 6}
              onClick={() => resetPwdPlayer && resetPwdMutation.mutate({ id: resetPwdPlayer.id, password: newPassword })}
            >
              Save Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
