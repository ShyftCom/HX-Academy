"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatCurrency, formatDate, parseJsonSafe } from "@/lib/utils";
import { Eye, Trash2, ClipboardList, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

export default function OrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, search, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), perPage: "20" });
      if (search) p.set("q", search);
      if (statusFilter && statusFilter !== "all") p.set("statusId", statusFilter);
      return fetch(`/api/orders?${p}`).then((r) => r.json());
    },
  });

  const { data: statuses } = useQuery({ queryKey: ["order-statuses"], queryFn: () => fetch("/api/orders/statuses").then((r) => r.json()) });

  const statusMutation = useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: string }) =>
      fetch(`/api/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statusId }) }).then((r) => r.json()),
    onSuccess: (data) => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["orders"] }); if (viewOrder) setViewOrder(data); },
    onError: () => toast.error("Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/orders/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Order deleted"); qc.invalidateQueries({ queryKey: ["orders"] }); setDeleteId(null); },
    onError: () => toast.error("Delete failed"),
  });

  const getStatusBadge = (s: any) => s ? (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: (s.color ?? "#6B7280") + "20", color: s.color ?? "#6B7280" }}>{s.name}</span>
  ) : <Badge variant="secondary">Unknown</Badge>;

  const columns = [
    { key: "orderNumber", header: "Order #", cell: (r: any) => <span className="font-mono text-sm font-medium">#{r.orderNumber}</span> },
    { key: "customer", header: "Customer", cell: (r: any) => {
      const cod = parseJsonSafe<any>(r.codData, {});
      return <div><p className="font-medium text-sm">{r.player?.fullName ?? cod["fullName"] ?? cod["Full Name"] ?? "Guest"}</p><p className="text-xs text-gray-400">{r.player?.phone ?? cod["phone"] ?? "—"}</p></div>;
    }},
    { key: "items", header: "Items", cell: (r: any) => <span className="text-sm">{r.items?.length ?? 0} item(s)</span> },
    { key: "total", header: "Total", cell: (r: any) => <span className="font-medium">{formatCurrency(r.totalAmount)}</span> },
    { key: "status", header: "Status", cell: (r: any) => getStatusBadge(r.status) },
    { key: "date", header: "Date", cell: (r: any) => formatDate(r.createdAt) },
    { key: "actions", header: "", cell: (r: any) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewOrder(r)}><Eye className="me-2 h-4 w-4" />View</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDeleteId(r.id)} destructive><Trash2 className="me-2 h-4 w-4" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Orders" description="Manage store orders">
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search orders..." className="w-64" />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No orders yet" emptyIcon={<ClipboardList className="h-8 w-8" />} />
      {data?.totalPages > 1 && <Pagination page={page} totalPages={data.totalPages} total={data.total} perPage={20} onPageChange={setPage} />}

      {/* Order Detail Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={(o) => !o && setViewOrder(null)}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>Order #{viewOrder?.orderNumber}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4 max-h-[65vh] overflow-y-auto">
            {viewOrder && <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Date</p>
                  <p className="text-sm font-medium">{formatDate(viewOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  {getStatusBadge(viewOrder.status)}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Change Status</label>
                  <Select value={viewOrder.statusId ?? ""} onValueChange={(v) => statusMutation.mutate({ id: viewOrder.id, statusId: v })}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-semibold mb-2">Customer Info</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(parseJsonSafe<any>(viewOrder.codData, {})).map(([k, v]: [string, any]) => (
                    <div key={k}><p className="text-xs text-gray-400 capitalize">{k}</p><p className="text-sm">{v}</p></div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-semibold mb-2">Items</p>
                <div className="space-y-2">
                  {viewOrder.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                      <div><p className="text-sm font-medium">{item.product?.name}</p><p className="text-xs text-gray-400">Qty: {item.quantity} × {formatCurrency(item.price)}</p></div>
                      <p className="font-medium text-sm">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t pt-3 dark:border-gray-700">
                  <p className="font-semibold">Total</p>
                  <p className="font-bold text-lg">{formatCurrency(viewOrder.totalAmount)}</p>
                </div>
              </div>
            </>}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete Order" description="This will permanently delete the order." confirmLabel="Delete" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
