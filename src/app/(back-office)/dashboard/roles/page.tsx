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
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permission-names";

// Sidebar order, so the matrix reads top-to-bottom like the menu it controls.
const MODULE_ORDER = [
  "reports", "calendar", "stations", "players", "leads", "summer_camp", "tickets",
  "subscriptions", "payments", "finance", "store", "orders", "hrm", "affiliate",
  "website", "schedule", "contact", "applications", "file_requirements", "surveys",
  "files", "activity_logs", "users", "roles", "affiliates", "settings",
];
const moduleRank = (m: string) => { const i = MODULE_ORDER.indexOf(m); return i === -1 ? MODULE_ORDER.length : i; };

export default function RolesPage() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Mirrors the gates the role routes now enforce. Editing a role rewrites its
  // whole permission set, so it is the most consequential button in the app.
  const { can } = usePermissions();
  const canCreate = can(PERMISSIONS.ROLES_CREATE);
  const canEdit = can(PERMISSIONS.ROLES_EDIT);
  const canDelete = can(PERMISSIONS.ROLES_DELETE);

  const [editRole, setEditRole] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", permissionIds: [] as string[] });

  const { data: roles, isLoading } = useQuery({ queryKey: ["roles"], queryFn: () => fetch("/api/roles").then((r) => r.json()) });
  const { data: permissions } = useQuery({ queryKey: ["permissions"], queryFn: () => fetch("/api/permissions").then((r) => r.json()) });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editRole ? `/api/roles/${editRole.id}` : "/api/roles";
      const res = await fetch(url, { method: editRole ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? t("common:toast.failed")); }
      return res.json();
    },
    onSuccess: () => { toast.success(editRole ? t("common:bo.roles.updated") : t("common:bo.roles.created")); qc.invalidateQueries({ queryKey: ["roles"] }); setModalOpen(false); setEditRole(null); setForm({ name: "", description: "", permissionIds: [] }); },
    onError: (e: any) => toast.error(e.message || t("common:toast.save_failed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/roles/${id}`, { method: "DELETE" }).then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error); } }),
    onSuccess: () => { toast.success(t("roles.deleted")); qc.invalidateQueries({ queryKey: ["roles"] }); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message || t("common:toast.delete_failed")),
  });

  const openAdd = () => { setEditRole(null); setForm({ name: "", description: "", permissionIds: [] }); setModalOpen(true); };
  const openEdit = (r: any) => { setEditRole(r); setForm({ name: r.name, description: r.description ?? "", permissionIds: r.permissions?.map((p: any) => p.permissionId) ?? [] }); setModalOpen(true); };

  const togglePermission = (id: string) => {
    setForm((f) => ({ ...f, permissionIds: f.permissionIds.includes(id) ? f.permissionIds.filter((p) => p !== id) : [...f.permissionIds, id] }));
  };

  const toggleModule = (ids: string[]) => {
    setForm((f) => {
      const allOn = ids.every((id) => f.permissionIds.includes(id));
      return { ...f, permissionIds: allOn ? f.permissionIds.filter((p) => !ids.includes(p)) : [...new Set([...f.permissionIds, ...ids])] };
    });
  };

  const grouped: [string, any[]][] = Object.entries(
    (permissions ?? []).reduce((acc: Record<string, any[]>, p: any) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {} as Record<string, any[]>),
  ).sort(([a], [b]) => moduleRank(a) - moduleRank(b)) as [string, any[]][];
  // Unknown modules/actions (added later without a label) fall back to their raw name.
  const moduleLabel = (m: string) => t(`common:bo.perm_modules.${m}`, { defaultValue: m });
  const actionLabel = (a: string) => t(`common:bo.perm_actions.${a}`, { defaultValue: a });

  return (
    <div className="space-y-5">
      <PageHeader title={t("roles.title")} description={t("roles.subtitle")}>
        {canCreate && <Button onClick={openAdd}><Plus className="me-2 h-4 w-4" />{t("roles.add")}</Button>}
      </PageHeader>

      {isLoading ? <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
        : roles?.length === 0 ? <EmptyState icon={Shield} title={t("roles.empty")} description={t("roles.empty_body")} action={{ label: t("roles.add"), onClick: openAdd }} />
        : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles?.map((role: any) => (
              <Card key={role.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{role.name}</h3>
                        {role.isSystem && <Badge variant="secondary">{t("roles.system")}</Badge>}
                      </div>
                      {role.description && <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{t("common:bo.roles.users_count", { count: role._count?.users ?? 0 })}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-4 min-h-[28px]">
                    {role.permissions?.slice(0, 6).map((rp: any) => (
                      <span key={rp.id} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">{rp.permission ? `${moduleLabel(rp.permission.module)} · ${actionLabel(rp.permission.action)}` : null}</span>
                    ))}
                    {(role.permissions?.length ?? 0) > 6 && <span className="text-xs text-gray-400">{t("common:bo.roles.more", { count: role.permissions.length - 6 })}</span>}
                  </div>
                  <div className="flex gap-2">
                    {canEdit && <Button variant="outline" size="sm" onClick={() => openEdit(role)}><Edit className="me-1.5 h-3.5 w-3.5" />{t("common:ui.edit")}</Button>}
                    {canDelete && !role.isSystem && <Button variant="outline" size="sm" className="text-red-600" onClick={() => setDeleteId(role.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>{editRole ? t("common:bo.roles.edit") : t("common:bo.roles.create")}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input label={t("roles.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("roles.name_ph")} />
            <Textarea label={t("common:ui.description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("roles.desc_ph")} rows={2} />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("roles.permissions")}</p>
              <p className="mb-3 text-xs text-gray-500">{t("common:bo.roles.modules_hint")}</p>
              <ScrollArea className="h-80 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {grouped.map(([module, perms]) => {
                    const ids = perms.map((p: any) => p.id);
                    const allOn = ids.every((id: string) => form.permissionIds.includes(id));
                    const someOn = !allOn && ids.some((id: string) => form.permissionIds.includes(id));
                    return (
                      <div key={module} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
                        <label className="flex w-48 shrink-0 cursor-pointer items-center gap-2">
                          <Checkbox checked={allOn ? true : someOn ? "indeterminate" : false} onCheckedChange={() => toggleModule(ids)} />
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{moduleLabel(module)}</span>
                        </label>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {perms.map((p: any) => (
                            <label key={p.id} className="flex cursor-pointer items-center gap-1.5" title={p.description ?? undefined}>
                              <Checkbox checked={form.permissionIds.includes(p.id)} onCheckedChange={() => togglePermission(p.id)} />
                              <span className="text-sm text-gray-600 dark:text-gray-400">{actionLabel(p.action)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <p className="mt-1.5 text-xs text-gray-400">{t("common:bo.roles.selected", { count: form.permissionIds.length })}</p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t("common:ui.cancel")}</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name}>{editRole ? t("common:bo.save_changes") : t("common:bo.roles.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title={t("roles.delete")} description={t("roles.delete_body")} confirmLabel={t("common:ui.delete")} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
