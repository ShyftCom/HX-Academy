"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDate, timeAgo, getInitials } from "@/lib/utils";
import { Plus, MoreHorizontal, Edit, Trash2, Users } from "lucide-react";

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", roleId: "", isActive: true });

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, search],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), perPage: "20" });
      if (search) p.set("q", search);
      return fetch(`/api/users?${p}`).then((r) => r.json());
    },
  });

  const { data: roles } = useQuery({ queryKey: ["roles-list"], queryFn: () => fetch("/api/roles").then((r) => r.json()) });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
      const body = editUser ? { name: form.name, roleId: form.roleId || null, isActive: form.isActive, ...(form.password && { password: form.password }) } : form;
      const res = await fetch(url, { method: editUser ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: () => { toast.success(editUser ? "User updated" : "User created"); qc.invalidateQueries({ queryKey: ["users"] }); setModalOpen(false); setEditUser(null); setForm({ name: "", email: "", password: "", roleId: "", isActive: true }); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: () => toast.error("Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/users/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: ["users"] }); setDeleteId(null); },
    onError: () => toast.error("Delete failed"),
  });

  const openAdd = () => { setEditUser(null); setForm({ name: "", email: "", password: "", roleId: "", isActive: true }); setModalOpen(true); };
  const openEdit = (u: any) => { setEditUser(u); setForm({ name: u.name ?? "", email: u.email, password: "", roleId: u.roleId ?? "", isActive: u.isActive }); setModalOpen(true); };

  const columns = [
    { key: "user", header: "User", cell: (r: any) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8"><AvatarFallback>{getInitials(r.name ?? r.email)}</AvatarFallback></Avatar>
        <div><p className="font-medium text-sm">{r.name ?? "—"}</p><p className="text-xs text-gray-400">{r.email}</p></div>
      </div>
    )},
    { key: "role", header: "Role", cell: (r: any) => r.role ? <Badge variant="default">{r.role.name}</Badge> : <Badge variant="secondary">No Role</Badge> },
    { key: "isActive", header: "Active", cell: (r: any) => <Switch checked={r.isActive} onCheckedChange={(v) => toggleMutation.mutate({ id: r.id, isActive: v })} /> },
    { key: "lastLogin", header: "Last Login", cell: (r: any) => r.lastLogin ? timeAgo(r.lastLogin) : "Never" },
    { key: "createdAt", header: "Created", cell: (r: any) => formatDate(r.createdAt) },
    { key: "actions", header: "", cell: (r: any) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDeleteId(r.id)} destructive><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Users & Accounts" description="Manage admin and staff accounts">
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add User</Button>
      </PageHeader>

      <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search users..." className="w-64" />

      <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No users found" emptyIcon={<Users className="h-8 w-8" />} />
      {data?.totalPages > 1 && <Pagination page={page} totalPages={data.totalPages} total={data.total} perPage={20} onPageChange={setPage} />}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{editUser ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input label="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
            {!editUser && <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@hxacademy.com" />}
            <Input label={editUser ? "New Password (leave blank to keep)" : "Password *"} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
              <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{roles?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active account</span>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name || (!editUser && (!form.email || !form.password))}>{editUser ? "Save Changes" : "Create User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete User" description="This will permanently delete the user account." confirmLabel="Delete" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
