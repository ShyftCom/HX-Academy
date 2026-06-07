"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Shield } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RolesPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", permissionIds: [] as string[] });

  const { data: roles, isLoading } = useQuery({ queryKey: ["roles"], queryFn: () => fetch("/api/roles").then((r) => r.json()) });
  const { data: permissions } = useQuery({ queryKey: ["permissions"], queryFn: () => fetch("/api/permissions").then((r) => r.json()) });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editRole ? `/api/roles/${editRole.id}` : "/api/roles";
      const res = await fetch(url, { method: editRole ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => { toast.success(editRole ? "Role updated" : "Role created"); qc.invalidateQueries({ queryKey: ["roles"] }); setModalOpen(false); setEditRole(null); setForm({ name: "", description: "", permissionIds: [] }); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/roles/${id}`, { method: "DELETE" }).then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error); } }),
    onSuccess: () => { toast.success("Role deleted"); qc.invalidateQueries({ queryKey: ["roles"] }); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const openAdd = () => { setEditRole(null); setForm({ name: "", description: "", permissionIds: [] }); setModalOpen(true); };
  const openEdit = (r: any) => { setEditRole(r); setForm({ name: r.name, description: r.description ?? "", permissionIds: r.permissions?.map((p: any) => p.permissionId) ?? [] }); setModalOpen(true); };

  const togglePermission = (id: string) => {
    setForm((f) => ({ ...f, permissionIds: f.permissionIds.includes(id) ? f.permissionIds.filter((p) => p !== id) : [...f.permissionIds, id] }));
  };

  const grouped = permissions?.reduce((acc: Record<string, any[]>, p: any) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <PageHeader title="Roles & Permissions" description="Manage access control">
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Role</Button>
      </PageHeader>

      {isLoading ? <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
        : roles?.length === 0 ? <EmptyState icon={Shield} title="No roles" description="Create roles to manage access control" action={{ label: "Add Role", onClick: openAdd }} />
        : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles?.map((role: any) => (
              <Card key={role.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{role.name}</h3>
                        {role.isSystem && <Badge variant="secondary">System</Badge>}
                      </div>
                      {role.description && <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{role._count?.users ?? 0} user(s)</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-4 min-h-[28px]">
                    {role.permissions?.slice(0, 6).map((rp: any) => (
                      <span key={rp.id} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">{rp.permission?.action}</span>
                    ))}
                    {(role.permissions?.length ?? 0) > 6 && <span className="text-xs text-gray-400">+{role.permissions.length - 6} more</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(role)}><Edit className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
                    {!role.isSystem && <Button variant="outline" size="sm" className="text-red-600" onClick={() => setDeleteId(role.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>{editRole ? "Edit Role" : "Create Role"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input label="Role Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Staff" />
            <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What can this role do?" rows={2} />
            <div>
              <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Permissions</p>
              <ScrollArea className="h-64 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                {Object.entries(grouped ?? {}).map(([module, perms]: [string, any]) => (
                  <div key={module} className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{module}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {perms.map((p: any) => (
                        <label key={p.id} className="flex cursor-pointer items-center gap-2">
                          <Checkbox checked={form.permissionIds.includes(p.id)} onCheckedChange={() => togglePermission(p.id)} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{p.action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
              <p className="mt-1.5 text-xs text-gray-400">{form.permissionIds.length} permission(s) selected</p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name}>{editRole ? "Save Changes" : "Create Role"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete Role" description="Users with this role will lose their permissions." confirmLabel="Delete" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
