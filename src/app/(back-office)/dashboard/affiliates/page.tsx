"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Link2, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const APP_URL = typeof window !== "undefined" ? window.location.origin : "";
function formatDA(n: number) { return Number(n).toLocaleString("fr-DZ") + " DA"; }

export default function AffiliatesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [rate, setRate] = useState("0");

  const { data: affiliates = [], isLoading } = useQuery<any[]>({
    queryKey: ["affiliates"],
    queryFn: () => fetch("/api/affiliates").then((r) => r.json()),
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });

  const totalReferrals = affiliates.reduce((s: number, a: any) => s + (a._count?.referrals ?? 0), 0);
  const totalPaid = affiliates.reduce((s: number, a: any) => s + (a.paidCount ?? 0), 0);
  const totalBalance = affiliates.reduce((s: number, a: any) => s + (a.balance ?? 0), 0);

  const createMut = useMutation({
    mutationFn: (data: any) => fetch("/api/affiliates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      qc.invalidateQueries({ queryKey: ["affiliates"] });
      toast.success("Affiliate created");
      setOpen(false); setUserId(""); setRate("0");
    },
    onError: () => toast.error("Failed to create affiliate"),
  });

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${APP_URL}/register?ref=${code}`);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Affiliate System</h1>
          <p className="text-sm text-gray-500">Manage affiliate links and commissions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="me-2 h-4 w-4" />New Affiliate</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Affiliate Account</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Staff Member</Label>
                <select
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                >
                  <option value="">Select user...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Commission Rate (%)</Label>
                <Input type="number" min="0" max="100" step="0.5" value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
              <Button className="w-full" disabled={!userId || createMut.isPending} onClick={() => createMut.mutate({ userId, commissionRate: Number(rate) })}>
                {createMut.isPending ? "Creating..." : "Create Affiliate"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Total Affiliates</p><p className="text-2xl font-bold">{affiliates.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Total Referrals</p><p className="text-2xl font-bold">{totalReferrals}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Paid</p><p className="text-2xl font-bold text-green-600">{totalPaid}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Commissions Owed</p><p className="text-2xl font-bold text-amber-600">{formatDA(totalBalance)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" />Affiliates</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-center text-sm text-gray-400 py-6">Loading...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-gray-500">
                  <th className="text-start py-2 pe-4">Name</th>
                  <th className="text-start py-2 pe-4">Code</th>
                  <th className="text-end py-2 pe-4">Referrals</th>
                  <th className="text-end py-2 pe-4">Paid/Unpaid</th>
                  <th className="text-end py-2 pe-4">Balance</th>
                  <th className="text-end py-2 pe-4">Rate</th>
                  <th className="text-end py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {affiliates.map((a: any) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="py-3 pe-4">
                        <p className="font-medium">{a.user?.name}</p>
                        <p className="text-xs text-gray-400">{a.user?.email}</p>
                      </td>
                      <td className="py-3 pe-4">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-mono">{a.code}</code>
                          <button onClick={() => copyLink(a.code)} className="text-gray-400 hover:text-gray-600">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 pe-4 text-end">{a._count?.referrals ?? 0}</td>
                      <td className="py-3 pe-4 text-end">
                        <span className="text-green-600">{a.paidCount ?? 0}</span>/<span className="text-red-500">{a.unpaidCount ?? 0}</span>
                      </td>
                      <td className="py-3 pe-4 text-end font-medium">{formatDA(a.balance ?? 0)}</td>
                      <td className="py-3 pe-4 text-end">{Number(a.commissionRate).toFixed(1)}%</td>
                      <td className="py-3 text-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/affiliates/${a.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {affiliates.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No affiliates yet.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
