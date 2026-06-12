"use client";

import { useState, useCallback } from "react";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge, type LeadStatus } from "@/components/leads/status-badge";
import { formatDate, getInitials } from "@/lib/utils";
import Link from "next/link";
import {
  Plus, MoreHorizontal, Edit, Trash2, UserCheck, MessagesSquare,
  Eye, Settings2, LayoutGrid, List,
} from "lucide-react";

const schema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
  categoryInterest: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  statusId: z.string().optional(),
  assignedStaffId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = ["U8", "U10", "U12", "U14", "U16", "U18", "Adult"];
const SOURCES = ["website", "referral", "social media", "walk-in", "other"];

// ─── Kanban board ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function KanbanBoard({
  leads,
  statuses,
  onEdit,
  onDelete,
  onConvert,
}: {
  leads: any[];
  statuses: LeadStatus[];
  onEdit: (lead: any) => void;
  onDelete: (id: string) => void;
  onConvert: (id: string) => void;
}) {
  const sorted = [...statuses].sort((a, b) => a.order - b.order);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {sorted.map((status) => {
        const rgb = hexToRgb(status.color) ?? { r: 107, g: 114, b: 128 };
        const columnLeads = leads.filter((l) => l.statusId === status.id);
        return (
          <div key={status.id} className="flex-shrink-0 w-64 flex flex-col rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl" style={{ background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`, borderBottom: "1px solid var(--card-border)" }}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: status.color }} />
              <span className="text-sm font-semibold flex-1" style={{ color: "var(--text-primary)" }}>{status.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`, color: status.color }}>
                {columnLeads.length}
              </span>
            </div>
            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ maxHeight: 520 }}>
              {columnLeads.map((lead) => (
                <KanbanCard key={lead.id} lead={lead} statuses={statuses} onEdit={onEdit} onDelete={onDelete} onConvert={onConvert} />
              ))}
              {columnLeads.length === 0 && (
                <div className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>No leads</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  lead,
  statuses,
  onEdit,
  onDelete,
  onConvert,
}: {
  lead: any;
  statuses: LeadStatus[];
  onEdit: (lead: any) => void;
  onDelete: (id: string) => void;
  onConvert: (id: string) => void;
}) {
  return (
    <div className="rounded-lg p-3 space-y-2.5 hover:shadow-sm transition-shadow" style={{ background: "var(--muted-bg)", border: "1px solid var(--card-border)" }}>
      <div className="flex items-start justify-between gap-1">
        <Link href={`/dashboard/leads/${lead.id}`} className="text-sm font-semibold leading-snug hover:underline" style={{ color: "var(--text-primary)" }}>
          {lead.fullName}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-0.5 rounded opacity-50 hover:opacity-100 flex-shrink-0" style={{ color: "var(--text-muted)" }}>
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild><Link href={`/dashboard/leads/${lead.id}`}><Eye className="mr-2 h-4 w-4" />View</Link></DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(lead)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            {!lead.isConverted && (
              <DropdownMenuItem onClick={() => onConvert(lead.id)}><UserCheck className="mr-2 h-4 w-4" />Convert</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onDelete(lead.id)} destructive><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Inline status badge on the card */}
      <StatusBadge
        leadId={lead.id}
        leadName={lead.fullName}
        currentStatus={lead.status}
        statuses={statuses}
      />

      <div className="flex items-center gap-2 flex-wrap">
        {lead.phone && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{lead.phone}</span>}
        {lead.categoryInterest && (
          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--card)", color: "var(--text-muted)", border: "1px solid var(--card-border)" }}>
            {lead.categoryInterest}
          </span>
        )}
        {lead.isConverted && (
          <span className="text-xs font-semibold" style={{ color: "#10B981" }}>Converted</span>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<"table" | "kanban">("table");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editLead, setEditLead] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["leads", page, search, statusFilter, sourceFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), perPage: view === "kanban" ? "200" : "20" });
      if (search) params.set("q", search);
      if (statusFilter && statusFilter !== "all") params.set("statusId", statusFilter);
      if (sourceFilter && sourceFilter !== "all") params.set("source", sourceFilter);
      return fetch(`/api/leads?${params}`).then((r) => r.json());
    },
  });

  const { data: statuses } = useQuery<LeadStatus[]>({
    queryKey: ["lead-statuses"],
    queryFn: () => fetch("/api/lead-statuses").then((r) => r.json()),
  });

  const { data: staff } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users?perPage=100").then((r) => r.json()),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const url = editLead ? `/api/leads/${editLead.id}` : "/api/leads";
      const res = await fetch(url, { method: editLead ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast.success(editLead ? "Lead updated" : "Lead created");
      qc.invalidateQueries({ queryKey: ["leads"] });
      setModalOpen(false);
      reset();
      setEditLead(null);
    },
    onError: () => toast.error("Failed to save lead"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/leads/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Lead deleted"); qc.invalidateQueries({ queryKey: ["leads"] }); setDeleteId(null); },
    onError: () => toast.error("Delete failed"),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/leads/${id}/convert`, { method: "POST" }).then(async (r) => {
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Conversion failed");
      return json;
    }),
    onSuccess: () => { toast.success("Lead converted to player!"); qc.invalidateQueries({ queryKey: ["leads"] }); setConvertId(null); },
    onError: (e: any) => toast.error(e.message ?? "Conversion failed"),
  });

  const openAdd = () => { setEditLead(null); reset(); setModalOpen(true); };
  const openEdit = useCallback((lead: any) => {
    setEditLead(lead);
    reset({
      fullName: lead.fullName, phone: lead.phone ?? "", email: lead.email ?? "",
      dateOfBirth: lead.dateOfBirth ? new Date(lead.dateOfBirth).toISOString().split("T")[0] : "",
      parentName: lead.parentName ?? "", parentPhone: lead.parentPhone ?? "", address: lead.address ?? "",
      categoryInterest: lead.categoryInterest ?? "", notes: lead.notes ?? "", source: lead.source ?? "",
      statusId: lead.statusId ?? "", assignedStaffId: lead.assignedStaffId ?? "",
    });
    setModalOpen(true);
  }, [reset]);

  const columns = [
    { key: "fullName", header: "Name", cell: (r: any) => (
      <Link href={`/dashboard/leads/${r.id}`} className="flex items-center gap-2 hover:underline">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold dark:bg-blue-900/30 dark:text-blue-400 flex-shrink-0">{getInitials(r.fullName)}</div>
        <div>
          <p className="font-medium text-sm">{r.fullName}</p>
          {r.isConverted && <span className="text-xs" style={{ color: "#10B981" }}>Converted</span>}
        </div>
      </Link>
    )},
    { key: "phone", header: "Phone", cell: (r: any) => r.phone ?? "—" },
    { key: "email", header: "Email", cell: (r: any) => r.email ? <span className="text-xs">{r.email}</span> : "—" },
    { key: "categoryInterest", header: "Category", cell: (r: any) => r.categoryInterest ? <Badge variant="outline">{r.categoryInterest}</Badge> : "—" },
    { key: "status", header: "Status", cell: (r: any) => (
      <StatusBadge
        leadId={r.id}
        leadName={r.fullName}
        currentStatus={r.status}
        statuses={statuses ?? []}
      />
    )},
    { key: "source", header: "Source", cell: (r: any) => r.source ? <Badge variant="secondary">{r.source}</Badge> : "—" },
    { key: "createdAt", header: "Date", cell: (r: any) => formatDate(r.createdAt) },
    { key: "actions", header: "", cell: (r: any) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link href={`/dashboard/leads/${r.id}`}><Eye className="mr-2 h-4 w-4" />View Activity</Link></DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
          {!r.isConverted && (
            <DropdownMenuItem onClick={() => setConvertId(r.id)}><UserCheck className="mr-2 h-4 w-4" />Convert to Player</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setDeleteId(r.id)} destructive><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Leads CRM" description="Manage potential players and track conversions">
        <Button variant="outline" asChild>
          <Link href="/dashboard/leads/pipeline"><Settings2 className="mr-2 h-4 w-4" />Pipeline Stages</Link>
        </Button>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Lead</Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search leads..." className="w-64" />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--muted-bg)" }}>
          <button onClick={() => setView("table")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={view === "table"
              ? { background: "var(--card)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
              : { color: "var(--text-muted)" }}>
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button onClick={() => setView("kanban")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={view === "kanban"
              ? { background: "var(--card)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
              : { color: "var(--text-muted)" }}>
            <LayoutGrid className="w-3.5 h-3.5" /> Board
          </button>
        </div>
      </div>

      {view === "table" ? (
        <>
          <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No leads found" emptyIcon={<MessagesSquare className="h-8 w-8" />} />
          {data?.totalPages > 1 && <Pagination page={page} totalPages={data.totalPages} total={data.total} perPage={20} onPageChange={setPage} />}
        </>
      ) : (
        <KanbanBoard
          leads={data?.data ?? []}
          statuses={statuses ?? []}
          onEdit={openEdit}
          onDelete={(id) => setDeleteId(id)}
          onConvert={(id) => setConvertId(id)}
        />
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="2xl">
          <DialogHeader><DialogTitle>{editLead ? "Edit Lead" : "Add New Lead"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
            <DialogBody className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              <Input {...register("fullName")} label="Full Name *" placeholder="John Doe" error={errors.fullName?.message} className="col-span-2 sm:col-span-1" />
              <Input {...register("phone")} label="Phone" placeholder="+213 ..." />
              <Input {...register("email")} label="Email" placeholder="email@example.com" error={errors.email?.message} />
              <Input {...register("dateOfBirth")} label="Date of Birth" type="date" />
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <Input {...register("parentName")} label="Parent Name" placeholder="Parent full name" />
                <Input {...register("parentPhone")} label="Parent Phone" placeholder="+213 ..." />
              </div>
              <Input {...register("address")} label="Address" placeholder="City, Region" className="col-span-2" />
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Category Interest</label>
                <Select onValueChange={(v) => setValue("categoryInterest", v)} defaultValue={editLead?.categoryInterest ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Source</label>
                <Select onValueChange={(v) => setValue("source", v)} defaultValue={editLead?.source ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Status</label>
                <Select onValueChange={(v) => setValue("statusId", v)} defaultValue={editLead?.statusId ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>{statuses?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Assign to Staff</label>
                <Select onValueChange={(v) => setValue("assignedStaffId", v)} defaultValue={editLead?.assignedStaffId ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>{staff?.data?.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Textarea {...register("notes")} label="Notes" placeholder="Any notes..." className="col-span-2" rows={3} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={saveMutation.isPending}>{editLead ? "Save Changes" : "Create Lead"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete Lead" description="This action cannot be undone. The lead will be permanently deleted." confirmLabel="Delete" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
      <ConfirmDialog open={!!convertId} onOpenChange={(o) => !o && setConvertId(null)} title="Convert to Player" description="This will create a player account for this lead. The lead's phone number will be used as the temporary password." confirmLabel="Convert" variant="default" onConfirm={() => convertId && convertMutation.mutate(convertId)} loading={convertMutation.isPending} />
    </div>
  );
}
