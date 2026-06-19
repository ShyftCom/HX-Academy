"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Ticket as TicketIcon, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

interface Ticket {
  id: string; title: string; description: string; status: string; priority: string;
  createdBy: { id: string; name: string | null; email: string };
  assignedTo: { id: string; name: string | null; email: string } | null;
  _count: { comments: number };
  createdAt: string; updatedAt: string;
}

export default function TicketsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", assignedToId: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", page, statusFilter, priorityFilter],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), perPage: "20" });
      if (statusFilter !== "all") p.set("status", statusFilter);
      if (priorityFilter !== "all") p.set("priority", priorityFilter);
      return fetch(`/api/tickets?${p}`).then((r) => r.json());
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-list"],
    queryFn: () => fetch("/api/users?perPage=100").then((r) => r.json()).then((d) => d.data ?? d),
  });

  const { mutate: createTicket, isPending: creating } = useMutation({
    mutationFn: (body: typeof form) =>
      fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      toast.success("Ticket created");
      qc.invalidateQueries({ queryKey: ["tickets"] });
      setNewOpen(false);
      setForm({ title: "", description: "", priority: "medium", assignedToId: "" });
    },
    onError: () => toast.error("Failed to create ticket"),
  });

  const tickets: Ticket[] = data?.data ?? [];

  const filteredTickets = search
    ? tickets.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))
    : tickets;

  return (
    <div className="space-y-6">
      <PageHeader title="Tickets" description="Internal support tickets and task tracking between team members.">
        <Button onClick={() => setNewOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Ticket</Button>
      </PageHeader>

      <div className="flex gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search tickets..." className="w-64" />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filteredTickets.length === 0 ? (
        <EmptyState icon={TicketIcon} title="No tickets" description="Create a ticket to track a task or request help." action={{ label: "New Ticket", onClick: () => setNewOpen(true) }} />
      ) : (
        <>
          <div className="space-y-2">
            {filteredTickets.map((ticket) => (
              <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="block">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{ticket.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status] ?? ""}`}>{ticket.status.replace("_", " ")}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>{ticket.priority}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{ticket.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>By {ticket.createdBy.name ?? ticket.createdBy.email}</span>
                        {ticket.assignedTo && <span>→ {ticket.assignedTo.name ?? ticket.assignedTo.email}</span>}
                        <span>{ticket._count.comments} comment{ticket._count.comments !== 1 ? "s" : ""}</span>
                        <span>{formatDate(ticket.updatedAt)}</span>
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} perPage={20} onPageChange={setPage} />
        </>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Ticket</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Brief description of the issue or task" className="mt-1" />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Provide full details..." rows={4} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign To</Label>
                <Select value={form.assignedToId || "unassigned"} onValueChange={(v) => setForm((f) => ({ ...f, assignedToId: v === "unassigned" ? "" : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select person..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {(Array.isArray(staff) ? staff : []).map((u: { id: string; name: string | null; email: string }) => (
                      <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={() => createTicket(form)} disabled={creating}>{creating ? "Creating..." : "Create Ticket"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
