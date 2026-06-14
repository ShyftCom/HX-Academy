"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, Wallet } from "lucide-react";
import { useState } from "react";

const APP_URL = typeof window !== "undefined" ? window.location.origin : "";
function formatDA(n: number) { return Number(n).toLocaleString("fr-DZ") + " DA"; }
function formatDate(d: string) { return new Date(d).toLocaleDateString("fr-DZ"); }

export default function MyAffiliatePage() {
  const qc = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const { data: affiliate, isLoading, isError } = useQuery({
    queryKey: ["affiliate-my"],
    queryFn: () => fetch("/api/affiliates/my").then((r) => r.json()),
  });

  const withdrawMut = useMutation({
    mutationFn: (amount: number) =>
      fetch(`/api/affiliates/${affiliate?.id}/withdraw`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      qc.invalidateQueries({ queryKey: ["affiliate-my"] });
      toast.success("Withdrawal request submitted");
      setWithdrawOpen(false); setWithdrawAmount("");
    },
  });

  const copyLink = () => {
    navigator.clipboard.writeText(`${APP_URL}/register?ref=${affiliate?.code}`);
    toast.success("Link copied");
  };

  if (isLoading) return <div className="p-8 text-center text-sm text-gray-400">Loading...</div>;
  if (isError || affiliate?.error) return <div className="p-8 text-center text-sm text-gray-400">You don't have an affiliate account. Contact your admin.</div>;

  const balance = affiliate?.balance ?? 0;
  const totalWithdrawn = affiliate?.withdrawals?.filter((w: any) => w.status === "approved").reduce((s: number, w: any) => s + Number(w.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Affiliate Dashboard</h1>
        <p className="text-sm text-gray-500">Track your referrals and commissions</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Total Referrals</p><p className="text-2xl font-bold">{affiliate.referrals?.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Paid</p><p className="text-2xl font-bold text-green-600">{affiliate.referrals?.filter((r: any) => r.paymentStatus === "paid").length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Unpaid</p><p className="text-2xl font-bold text-red-500">{affiliate.referrals?.filter((r: any) => r.paymentStatus === "unpaid").length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Current Balance</p><p className="text-2xl font-bold text-blue-600">{formatDA(balance)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Total Withdrawn</p><p className="text-2xl font-bold">{formatDA(totalWithdrawn)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-2">Your Affiliate Link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm font-mono truncate">
              {APP_URL}/register?ref={affiliate.code}
            </code>
            <Button variant="outline" size="sm" onClick={copyLink}><Copy className="me-2 h-4 w-4" />Copy</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogTrigger asChild>
            <Button disabled={balance <= 0}><Wallet className="me-2 h-4 w-4" />Request Withdrawal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request Withdrawal</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-500">Available balance: <strong>{formatDA(balance)}</strong></p>
              <div className="space-y-1">
                <Label>Amount (DA)</Label>
                <Input type="number" min="1" max={balance} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Enter amount..." />
              </div>
              <Button className="w-full" disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || withdrawMut.isPending}
                onClick={() => withdrawMut.mutate(Number(withdrawAmount))}>
                {withdrawMut.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="referrals">
        <TabsList>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="mt-4">
          <Card><CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-gray-500">
                <th className="text-start py-2 pe-4">Player</th>
                <th className="text-start py-2 pe-4">Date</th>
                <th className="text-start py-2 pe-4">Station</th>
                <th className="text-end py-2 pe-4">Status</th>
                <th className="text-end py-2">Amount</th>
              </tr></thead>
              <tbody>
                {affiliate.referrals?.map((r: any) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-3 pe-4 font-medium">{r.player?.fullName}</td>
                    <td className="py-3 pe-4 text-gray-500">{formatDate(r.registrationDate)}</td>
                    <td className="py-3 pe-4 text-gray-500">{r.station?.name ?? "—"}</td>
                    <td className="py-3 pe-4 text-end"><Badge variant={r.paymentStatus === "paid" ? "default" : "secondary"}>{r.paymentStatus}</Badge></td>
                    <td className="py-3 text-end">{r.paymentStatus === "paid" ? formatDA(r.amountPaid) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!affiliate.referrals?.length && <p className="py-6 text-center text-sm text-gray-400">No referrals yet.</p>}
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
              </div>
            ))}
            {!affiliate.withdrawals?.length && <p className="py-6 text-center text-sm text-gray-400">No withdrawal requests.</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
