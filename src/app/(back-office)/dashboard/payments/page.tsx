"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Check, X, Eye, Upload, CreditCard, Download, ZoomIn, FileText } from "lucide-react";

type Status = "all" | "pending" | "approved" | "rejected";

function ProofViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const isPdf = url.toLowerCase().includes(".pdf") || url.includes("application/pdf");
  const filename = url.split("/").pop() ?? "proof";

  function handleDownload() {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.click();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPdf ? <FileText className="h-5 w-5 text-red-500" /> : <ZoomIn className="h-5 w-5 text-blue-500" />}
            Payment Proof
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="p-0 overflow-hidden">
          {isPdf ? (
            <iframe src={url} className="w-full h-[70vh] rounded-b-xl" title="Payment proof PDF" />
          ) : (
            <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 min-h-64 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Payment proof" className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md" />
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleDownload}>
            <Download className="mr-1.5 h-4 w-4" /> Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentsPage() {
  const qc = useQueryClient();
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ playerId: "", planId: "", amount: "", paymentMethodId: "", proof: "" });
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingAdd, setUploadingAdd] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["payments", page, search, status],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), perPage: "20" });
      if (search) p.set("q", search);
      if (status !== "all") p.set("status", status);
      return fetch(`/api/payments?${p}`).then((r) => r.json());
    },
  });

  const { data: plans } = useQuery({ queryKey: ["subscription-plans"], queryFn: () => fetch("/api/subscriptions/plans").then((r) => r.json()) });
  const { data: players } = useQuery({ queryKey: ["players-list"], queryFn: () => fetch("/api/players?perPage=200").then((r) => r.json()) });
  const { data: methods } = useQuery({ queryKey: ["payment-methods"], queryFn: () => fetch("/api/payments/methods").then((r) => r.json()) });

  const approveMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/payments/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminNotes: approveNote }) }).then(async (r) => { if (!r.ok) throw await r.json(); }),
    onSuccess: () => { toast.success("Payment approved & subscription activated"); qc.invalidateQueries({ queryKey: ["payments"] }); setApproveId(null); setApproveNote(""); },
    onError: (e: any) => toast.error(e.error ?? "Approval failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/payments/${id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: rejectReason }) }).then(async (r) => { if (!r.ok) throw await r.json(); }),
    onSuccess: () => { toast.success("Payment rejected"); qc.invalidateQueries({ queryKey: ["payments"] }); setRejectId(null); setRejectReason(""); },
    onError: () => toast.error("Rejection failed"),
  });

  const addMutation = useMutation({
    mutationFn: () => fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...addForm, amount: parseFloat(addForm.amount), proof: proofUrl }) }).then(async (r) => { if (!r.ok) throw await r.json(); }),
    onSuccess: () => { toast.success("Payment created"); qc.invalidateQueries({ queryKey: ["payments"] }); setAddOpen(false); setProofUrl(null); setAddForm({ playerId: "", planId: "", amount: "", paymentMethodId: "", proof: "" }); },
    onError: () => toast.error("Create failed"),
  });

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAdd(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "payments");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (res.ok) { setProofUrl(d.url); toast.success("Proof uploaded"); }
    else toast.error(d.error ?? "Upload failed");
    setUploadingAdd(false);
  };

  const STATUS_VARIANT: Record<string, string> = { pending: "warning", approved: "success", rejected: "destructive" };

  const columns = [
    { key: "player", header: "Player", cell: (r: any) => <div><p className="font-medium text-sm">{r.player?.fullName}</p><p className="text-xs text-gray-400">{r.player?.phone}</p></div> },
    { key: "plan", header: "Plan", cell: (r: any) => <span className="text-sm">{r.plan?.name ?? "—"}</span> },
    { key: "amount", header: "Amount", cell: (r: any) => <span className="font-medium">{formatCurrency(r.amount)}</span> },
    { key: "method", header: "Method", cell: (r: any) => r.paymentMethod?.name ?? "—" },
    { key: "status", header: "Status", cell: (r: any) => <Badge variant={STATUS_VARIANT[r.status] as any}>{r.status}</Badge> },
    {
      key: "proof", header: "Proof", cell: (r: any) => r.proof ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPreviewUrl(r.proof)}
            className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 transition-colors"
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
          <a
            href={r.proof}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 transition-colors"
          >
            <Download className="h-3 w-3" /> Download
          </a>
        </div>
      ) : <span className="text-xs text-gray-400">No proof</span>
    },
    { key: "date", header: "Date", cell: (r: any) => formatDate(r.createdAt) },
    {
      key: "actions", header: "", cell: (r: any) => (
        <div className="flex gap-1">
          {r.status === "pending" && <>
            <Button size="icon-sm" variant="success" onClick={() => setApproveId(r.id)} title="Approve"><Check className="h-3.5 w-3.5" /></Button>
            <Button size="icon-sm" variant="destructive" onClick={() => setRejectId(r.id)} title="Reject"><X className="h-3.5 w-3.5" /></Button>
          </>}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Payments" description="Manage payment verification">
        <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Payment</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by player..." className="w-64" />
        {(["all", "pending", "approved", "rejected"] as Status[]).map((s) => (
          <Button key={s} variant={status === s ? "default" : "outline"} size="sm" onClick={() => { setStatus(s); setPage(1); }} className="capitalize">{s}</Button>
        ))}
      </div>

      <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No payments found" emptyIcon={<CreditCard className="h-8 w-8" />} />
      {data?.totalPages > 1 && <Pagination page={page} totalPages={data.totalPages} total={data.total} perPage={20} onPageChange={setPage} />}

      {/* Proof Preview Dialog */}
      {previewUrl && <ProofViewer url={previewUrl} onClose={() => setPreviewUrl(null)} />}

      {/* Approve Dialog */}
      <Dialog open={!!approveId} onOpenChange={(o) => !o && setApproveId(null)}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Approve Payment</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">The payment will be approved and the subscription will be activated.</p>
            <Textarea label="Admin Note (optional)" value={approveNote} onChange={(e) => setApproveNote(e.target.value)} placeholder="Optional note..." rows={2} />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveId(null)}>Cancel</Button>
            <Button variant="success" onClick={() => approveId && approveMutation.mutate(approveId)} loading={approveMutation.isPending}><Check className="mr-1.5 h-4 w-4" />Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Reject Payment</DialogTitle></DialogHeader>
          <DialogBody>
            <Textarea label="Rejection Reason *" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why the payment is rejected..." rows={3} />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectId && rejectMutation.mutate(rejectId)} loading={rejectMutation.isPending} disabled={!rejectReason.trim()}><X className="mr-1.5 h-4 w-4" />Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Payment Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>Create Payment</DialogTitle></DialogHeader>
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
              <Select value={addForm.planId} onValueChange={(v) => { const plan = plans?.find((p: any) => p.id === v); setAddForm({ ...addForm, planId: v, amount: plan ? String(plan.price) : "" }); }}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>{plans?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.price} DA</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input label="Amount (DA) *" type="number" value={addForm.amount} onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })} placeholder="5000" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
              <Select value={addForm.paymentMethodId} onValueChange={(v) => setAddForm({ ...addForm, paymentMethodId: v })}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>{methods?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Proof</label>
              <div className="flex items-center gap-2">
                <input ref={proofInputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleProofUpload} />
                <Button type="button" variant="outline" size="sm" onClick={() => proofInputRef.current?.click()} loading={uploadingAdd}>
                  <Upload className="mr-1.5 h-4 w-4" />{uploadingAdd ? "Uploading..." : "Upload Proof"}
                </Button>
                {proofUrl && (
                  <button onClick={() => setPreviewUrl(proofUrl)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                )}
              </div>
              {proofUrl && <p className="mt-1 text-xs text-green-600">✓ Proof uploaded successfully</p>}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} loading={addMutation.isPending} disabled={!addForm.playerId || !addForm.planId || !addForm.amount}>Create Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
