"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const APP_URL = typeof window !== "undefined" ? window.location.origin : "";
function formatDA(n: number) { return Number(n).toLocaleString("fr-DZ") + " DA"; }
function formatDate(d: string) { return new Date(d).toLocaleDateString("fr-DZ"); }

export default function AffiliateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: affiliate, isLoading } = useQuery({
    queryKey: ["affiliate", id],
    queryFn: () => fetch(`/api/affiliates/${id}`).then((r) => r.json()),
  });

  const markPaidMut = useMutation({
    mutationFn: ({ refId, amount }: { refId: string; amount: number }) =>
      fetch(`/api/affiliates/referrals/${refId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountPaid: amount }) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["affiliate", id] }); toast.success("Referral marked as paid"); },
  });

  const withdrawalActionMut = useMutation({
    mutationFn: ({ wId, action }: { wId: string; action: string }) =>
      fetch(`/api/affiliates/withdrawals/${wId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, notes: notes[wId] }) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["affiliate", id] }); toast.success("Withdrawal updated"); },
  });

  const copyLink = () => {
    navigator.clipboard.writeText(`${APP_URL}/register?ref=${affiliate?.code}`);
    toast.success("Link copied");
  };

  if (isLoading) return <div className="p-8 text-center text-sm text-gray-400">Loading...</div>;
  if (!affiliate || affiliate.error) return <div className="p-8 text-center text-sm text-red-400">Not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link href="/dashboard/affiliates"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{affiliate.user?.name}</h1>
          <p className="text-sm text-gray-500">{affiliate.user?.email}</p>
        </div>
        <Badge variant={affiliate.status === "active" ? "default" : "secondary"}>{affiliate.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Referrals</p><p className="text-2xl font-bold">{affiliate.referrals?.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Commission Rate</p><p className="text-2xl font-bold">{Number(affiliate.commissionRate).toFixed(1)}%</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Balance</p><p className="text-2xl font-bold text-green-600">{formatDA(affiliate.balance ?? 0)}</p></CardContent></Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 mb-1">Affiliate Link</p>
            <div className="flex items-center gap-2">
              <code className="text-xs truncate flex-1 rounded bg-gray-100 dark:bg-gray-800 px-2 py-1">{APP_URL}/register?ref={affiliate.code}</code>
              <button onClick={copyLink}><Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="referrals">
        <TabsList>
          <TabsTrigger value="referrals">Referrals ({affiliate.referrals?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals ({affiliate.withdrawals?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="earnings">Earnings ({affiliate.earnings?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="mt-4">
          <Card><CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-gray-500">
                <th className="text-start py-2 pe-4">Player</th>
                <th className="text-start py-2 pe-4">Date</th>
                <th className="text-start py-2 pe-4">Station</th>
                <th className="text-end py-2 pe-4">Status</th>
                <th className="text-end py-2 pe-4">Amount Paid</th>
                <th className="text-end py-2">Action</th>
              </tr></thead>
              <tbody>
                {affiliate.referrals?.map((r: any) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-3 pe-4 font-medium">{r.player?.fullName}</td>
                    <td className="py-3 pe-4 text-gray-500">{formatDate(r.registrationDate)}</td>
                    <td className="py-3 pe-4 text-gray-500">{r.station?.name ?? "—"}</td>
                    <td className="py-3 pe-4 text-end">
                      <Badge variant={r.paymentStatus === "paid" ? "default" : "secondary"}>{r.paymentStatus}</Badge>
                    </td>
                    <td className="py-3 pe-4 text-end">{r.paymentStatus === "paid" ? formatDA(r.amountPaid) : "—"}</td>
                    <td className="py-3 text-end">
                      {r.paymentStatus === "unpaid" && (
                        <Button size="sm" onClick={() => {
                          const amt = prompt("Enter amount paid (DA):");
                          if (amt && !isNaN(Number(amt))) markPaidMut.mutate({ refId: r.id, amount: Number(amt) });
                        }}>Mark Paid</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4">
          <Card><CardContent className="pt-4 space-y-3">
            {affiliate.withdrawals?.map((w: any) => (
              <div key={w.id} className="flex items-center gap-4 rounded-lg border p-3">
                <div className="flex-1">
                  <p className="font-medium">{formatDA(w.amount)}</p>
                  <p className="text-xs text-gray-400">{formatDate(w.requestedAt)}</p>
                  {w.notes && <p className="text-xs text-gray-500 mt-1">{w.notes}</p>}
                </div>
                <Badge variant={w.status === "approved" ? "default" : w.status === "rejected" ? "destructive" : "secondary"}>{w.status}</Badge>
                {w.status === "pending" && (
                  <div className="flex gap-2 items-center">
                    <Input className="w-48 h-8 text-xs" placeholder="Note (optional)" value={notes[w.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [w.id]: e.target.value }))} />
                    <Button size="sm" onClick={() => withdrawalActionMut.mutate({ wId: w.id, action: "approve" })}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => withdrawalActionMut.mutate({ wId: w.id, action: "reject" })}>Reject</Button>
                  </div>
                )}
              </div>
            ))}
            {!affiliate.withdrawals?.length && <p className="text-center text-sm text-gray-400 py-4">No withdrawal requests.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="earnings" className="mt-4">
          <Card><CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-gray-500">
                <th className="text-start py-2 pe-4">Date</th>
                <th className="text-end py-2 pe-4">Amount</th>
                <th className="text-end py-2">Status</th>
              </tr></thead>
              <tbody>
                {affiliate.earnings?.map((e: any) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-3 pe-4 text-gray-500">{formatDate(e.createdAt)}</td>
                    <td className="py-3 pe-4 text-end font-medium text-green-600">{formatDA(e.amount)}</td>
                    <td className="py-3 text-end"><Badge>{e.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
