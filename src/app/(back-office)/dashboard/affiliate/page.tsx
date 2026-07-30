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
import { useTranslation } from "react-i18next";

const APP_URL = typeof window !== "undefined" ? window.location.origin : "";
function formatDA(n: number) { return Number(n).toLocaleString("fr-DZ") + " DA"; }
function formatDate(d: string) { return new Date(d).toLocaleDateString("fr-DZ"); }

export default function MyAffiliatePage() {
  const { t } = useTranslation("affiliates");
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
      toast.success(t("withdrawal_submitted"));
      setWithdrawOpen(false); setWithdrawAmount("");
    },
  });

  const copyLink = () => {
    navigator.clipboard.writeText(`${APP_URL}/register?ref=${affiliate?.code}`);
    toast.success(t("link_copied"));
  };

  if (isLoading) return <div className="p-8 text-center text-sm text-gray-400">{t("common:ui.loading")}</div>;
  if (isError || affiliate?.error) return <div className="p-8 text-center text-sm text-gray-400">{t("no_account")}</div>;

  const balance = affiliate?.balance ?? 0;
  const totalWithdrawn = affiliate?.withdrawals?.filter((w: any) => w.status === "approved").reduce((s: number, w: any) => s + Number(w.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("my_title")}</h1>
        <p className="text-sm text-gray-500">{t("my_subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">{t("total_referrals")}</p><p className="text-2xl font-bold">{affiliate.referrals?.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">{t("common:ui.paid")}</p><p className="text-2xl font-bold text-green-600">{affiliate.referrals?.filter((r: any) => r.paymentStatus === "paid").length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">{t("unpaid")}</p><p className="text-2xl font-bold text-red-500">{affiliate.referrals?.filter((r: any) => r.paymentStatus === "unpaid").length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">{t("current_balance")}</p><p className="text-2xl font-bold text-blue-600">{formatDA(balance)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">{t("total_withdrawn")}</p><p className="text-2xl font-bold">{formatDA(totalWithdrawn)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-2">{t("your_link")}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm font-mono truncate">
              {APP_URL}/register?ref={affiliate.code}
            </code>
            <Button variant="outline" size="sm" onClick={copyLink}><Copy className="me-2 h-4 w-4" />{t("copy")}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogTrigger asChild>
            <Button disabled={balance <= 0}><Wallet className="me-2 h-4 w-4" />{t("request_withdrawal")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("request_withdrawal")}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-500">{t("available_balance")} <strong>{formatDA(balance)}</strong></p>
              <div className="space-y-1">
                <Label>{t("amount_da")}</Label>
                <Input type="number" min="1" max={balance} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder={t("enter_amount")} />
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
          <TabsTrigger value="referrals">{t("referrals")}</TabsTrigger>
          <TabsTrigger value="withdrawals">{t("withdrawals")}</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="mt-4">
          <Card><CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-gray-500">
                <th className="text-start py-2 pe-4">{t("common:ui.player")}</th>
                <th className="text-start py-2 pe-4">{t("common:ui.date")}</th>
                <th className="text-start py-2 pe-4">{t("common:ui.station")}</th>
                <th className="text-end py-2 pe-4">{t("common:ui.status")}</th>
                <th className="text-end py-2">{t("common:ui.amount")}</th>
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
            {!affiliate.referrals?.length && <p className="py-6 text-center text-sm text-gray-400">{t("no_referrals")}</p>}
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
            {!affiliate.withdrawals?.length && <p className="py-6 text-center text-sm text-gray-400">{t("no_withdrawals")}</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
