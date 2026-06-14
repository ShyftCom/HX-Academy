"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, Package, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  processing: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  returned: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

interface OrderItem { id: string; quantity: number; price: number; product: { name: string } }
interface WebsiteOrder {
  id: string; orderNumber: string; customerName: string; customerPhone: string;
  customerEmail: string | null; wilaya: string | null; city: string | null; address: string | null;
  deliveryNotes: string | null; subtotal: number; shippingFee: number; total: number;
  status: string; createdAt: string; items: OrderItem[];
}

export default function StoreOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<WebsiteOrder | null>(null);
  const [newStatus, setNewStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["website-orders", page, search, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), perPage: "20" });
      if (search) p.set("q", search);
      if (statusFilter && statusFilter !== "all") p.set("status", statusFilter);
      return fetch(`/api/website/store/orders?${p}`).then((r) => r.json());
    },
  });

  const { mutate: updateStatus, isPending: updating } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/website/store/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: (updated) => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["website-orders"] });
      if (selectedOrder) setSelectedOrder({ ...selectedOrder, status: updated.status });
    },
    onError: () => toast.error("Failed to update"),
  });

  const orders: WebsiteOrder[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader title="Store Orders" description="Manage all orders placed through the website store." />

      <div className="flex gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search orders..." className="w-64" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" description="Orders placed through the website store will appear here." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Order #", "Customer", "Wilaya", "Items", "Total", "Status", "Date", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{o.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{o.customerName}</p>
                      <p className="text-xs text-gray-500">{o.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{o.wilaya ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{o.items?.length ?? 0}</td>
                    <td className="px-4 py-3 font-semibold">{Number(o.total).toLocaleString()} DA</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? ""}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedOrder(o); setNewStatus(o.status); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} perPage={20} onPageChange={setPage} />
        </>
      )}

      {selectedOrder && (
        <Dialog open onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order {selectedOrder.orderNumber}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs uppercase font-medium mb-1">Customer</p>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                  <p className="text-gray-600">{selectedOrder.customerPhone}</p>
                  {selectedOrder.customerEmail && <p className="text-gray-600">{selectedOrder.customerEmail}</p>}
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase font-medium mb-1">Delivery</p>
                  <p>{selectedOrder.wilaya}{selectedOrder.city ? `, ${selectedOrder.city}` : ""}</p>
                  {selectedOrder.address && <p className="text-gray-600">{selectedOrder.address}</p>}
                  {selectedOrder.deliveryNotes && <p className="text-gray-400 text-xs mt-1">{selectedOrder.deliveryNotes}</p>}
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-right p-3 font-medium">Qty</th>
                      <th className="text-right p-3 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100 dark:border-gray-600">
                        <td className="p-3">{item.product?.name}</td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right">{(Number(item.price) * item.quantity).toLocaleString()} DA</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <td className="p-3 text-gray-500" colSpan={2}>Subtotal</td>
                      <td className="p-3 text-right">{Number(selectedOrder.subtotal).toLocaleString()} DA</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-gray-500" colSpan={2}>Shipping</td>
                      <td className="p-3 text-right">{Number(selectedOrder.shippingFee) === 0 ? "Free" : `${Number(selectedOrder.shippingFee).toLocaleString()} DA`}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold" colSpan={2}>Total</td>
                      <td className="p-3 text-right font-semibold">{Number(selectedOrder.total).toLocaleString()} DA</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-3 items-center">
                <label className="text-sm font-medium">Status:</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => updateStatus({ id: selectedOrder.id, status: newStatus })}
                  disabled={updating || newStatus === selectedOrder.status}
                >
                  {updating ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
