"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import { CreditCard, Upload, Clock, CheckCircle, Landmark, ShieldCheck } from "lucide-react";
import { FullPageLoader } from "@/components/shared/loading-spinner";

export default function PlayerSubscriptionsPage() {
  const { data: session } = useSession();
  const playerId = (session?.user as any)?.playerId;
  const qc = useQueryClient();
  const [renewOpen, setRenewOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  /** "online" = SlickPay card checkout, "manual" = upload a receipt for admin approval. */
  const [payMode, setPayMode] = useState<"online" | "manual">("online");

  const { data: player, isLoading } = useQuery({
    queryKey: ["player-profile", playerId],
    queryFn: () => fetch(`/api/players/${playerId}`).then((r) => r.json()),
    enabled: !!playerId,
  });

  const { data: plans } = useQuery({ queryKey: ["subscription-plans"], queryFn: () => fetch("/api/subscriptions/plans").then((r) => r.json()) });
  const { data: methods } = useQuery({ queryKey: ["payment-methods-public"], queryFn: () => fetch("/api/payments/methods").then((r) => r.json()) });
  const { data: gateway } = useQuery({ queryKey: ["slickpay-status"], queryFn: () => fetch("/api/payments/slickpay/status").then((r) => r.json()) });

  const onlineAvailable = gateway?.available === true;

  // SlickPay rejects an invoice with no phone number, so a player whose
  // profile is incomplete would reach SATIM only to be bounced. Catch it here
  // instead, and point at the page where they can fix it. Email is not checked
  // because the server falls back to the login email, which always exists.
  const missingPhone = !player?.phone?.trim();

  // Derived rather than synced through an effect: with the gateway off — or
  // with a profile the gateway would reject — there is no card option to
  // choose, so the page falls back to the manual flow it has always had,
  // whatever the toggle last held. Without the missingPhone term the card
  // tile would be disabled while the footer still offered "Pay by card".
  const mode = onlineAvailable && !missingPhone ? payMode : "manual";

  // Report the outcome of a return trip from SATIM. Read straight off
  // window.location rather than useSearchParams so this page does not need a
  // Suspense boundary. The query param is stripped afterwards so a refresh
  // does not re-toast a payment the player already saw.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("payment");
    if (!result) return;

    if (result === "success") toast.success("Payment confirmed — your subscription is now active.");
    else if (result === "review") toast.warning("Your payment came through for a different amount than expected, so we've put it in front of our team. They'll be in touch shortly.");
    else if (result === "pending") toast.info("Payment received. We're confirming it with SlickPay — this page will update shortly.");
    else if (result === "failed") toast.error("The payment did not go through. Nothing was charged twice — you can try again.");
    else toast.error("We couldn't confirm that payment. Please check your payment history below.");

    qc.invalidateQueries({ queryKey: ["player-profile"] });
    window.history.replaceState({}, "", window.location.pathname);
  }, [qc]);

  const renewMutation = useMutation({
    mutationFn: async () => {
      if (!playerId || !selectedPlanId) throw new Error("Required fields missing");
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, planId: selectedPlanId, amount: plans?.find((p: any) => p.id === selectedPlanId)?.price ?? 0, paymentMethodId: selectedMethodId || null, proof: proofUrl || null, status: "pending" }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => { toast.success("Payment submitted! Awaiting admin approval."); qc.invalidateQueries({ queryKey: ["player-profile"] }); setRenewOpen(false); setProofUrl(""); setSelectedPlanId(""); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  // Card checkout. The amount is deliberately not sent — the server charges the
  // plan's own price, so nothing here can change what the player is billed.
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payments/slickpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // No subscriptionId: a renewal creates a fresh subscription row, which
        // is exactly what the manual receipt flow already does on approval.
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not start the payment");
      return d as { url: string };
    },
    // Hand the browser over to SATIM. No state reset — we are leaving the page.
    onSuccess: (d) => { window.location.href = d.url; },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const uploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("folder", "payments");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (res.ok) { setProofUrl(d.url); toast.success("Proof uploaded"); }
    else toast.error("Upload failed");
    setUploading(false);
  };

  if (isLoading || !playerId) return <FullPageLoader />;

  const activeSub = player?.subscriptions?.find((s: any) => s.status === "active");
  const selectedPlan = plans?.find((p: any) => p.id === selectedPlanId);
  const selectedMethod = methods?.find((m: any) => m.id === selectedMethodId);

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Subscriptions</h1>

      {/* Active Subscription */}
      {activeSub ? (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400">Current Plan</p>
                <p className="text-lg font-bold">{activeSub.plan?.name}</p>
                <p className="text-sm text-gray-500">{formatCurrency(activeSub.plan?.price)} / {activeSub.plan?.duration} {activeSub.plan?.durationType}</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-400">Start Date</p><p className="text-sm font-medium">{formatDate(activeSub.startDate)}</p></div>
              <div><p className="text-xs text-gray-400">Expiry Date</p><p className="text-sm font-medium">{formatDate(activeSub.endDate)}</p></div>
            </div>
            {activeSub.endDate && (
              <div className="mt-3">
                {(() => {
                  const days = differenceInDays(parseISO(activeSub.endDate), new Date());
                  if (days <= 7) return <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"><Clock className="h-4 w-4" />{days <= 0 ? "Subscription expired" : `${days} days left — renew now!`}</div>;
                  return <div className="flex items-center gap-2 rounded-lg bg-green-50 p-2.5 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400"><CheckCircle className="h-4 w-4" />{days} days remaining</div>;
                })()}
              </div>
            )}
            <Button className="w-full mt-4" onClick={() => setRenewOpen(true)}>Renew Subscription</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 text-center">
            <CreditCard className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No active subscription</p>
            <Button onClick={() => setRenewOpen(true)}>Choose a Plan</Button>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
        <CardContent>
          {player?.payments?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No payments yet</p>
          ) : (
            <div className="space-y-2">
              {player?.payments?.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border dark:border-gray-700 p-3">
                  <div>
                    <p className="text-sm font-medium">{p.plan?.name}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                    {p.status === "rejected" && p.rejectionReason && <p className="text-xs text-red-500 mt-0.5">Reason: {p.rejectionReason}</p>}
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                    <Badge variant={p.status === "approved" ? "success" : p.status === "rejected" ? "destructive" : "warning"} className="text-[10px]">{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renew Dialog */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>Subscribe / Renew</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Select Plan *</label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                <SelectContent>
                  {plans?.filter((p: any) => p.isActive).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)} / {p.duration} {p.durationType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {onlineAvailable && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">How would you like to pay?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={missingPhone}
                    onClick={() => setPayMode("online")}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-start transition-colors ${missingPhone ? "cursor-not-allowed border-gray-200 opacity-50 dark:border-gray-700" : mode === "online" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 hover:border-gray-300 dark:border-gray-700"}`}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium"><CreditCard className="h-4 w-4" />Card</span>
                    <span className="text-xs text-gray-500">CIB / Edahabia — activates instantly</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMode("manual")}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-start transition-colors ${mode === "manual" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 hover:border-gray-300 dark:border-gray-700"}`}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium"><Landmark className="h-4 w-4" />Transfer</span>
                    <span className="text-xs text-gray-500">Upload a receipt — admin approves</span>
                  </button>
                </div>
                {missingPhone && (
                  <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    Card payment needs a phone number on your profile.{" "}
                    <Link href="/player/profile" className="font-medium underline">Add it here</Link>, then come back.
                  </p>
                )}
                {gateway?.sandbox && mode === "online" && (
                  <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    Test mode — no real money will be taken.
                  </p>
                )}
              </div>
            )}

            {mode === "manual" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
              <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>{methods?.filter((m: any) => m.isActive).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            )}
            {mode === "manual" && selectedMethod && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-900/20">
                <p className="font-medium text-blue-800 dark:text-blue-300">{selectedMethod.name}</p>
                {selectedMethod.instructions && <p className="mt-1 text-blue-600 dark:text-blue-400">{selectedMethod.instructions}</p>}
                {selectedMethod.accountDetails && <p className="mt-1 font-mono text-sm text-blue-700 dark:text-blue-300">{selectedMethod.accountDetails}</p>}
              </div>
            )}
            {selectedPlan && (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount to pay:</span>
                <span className="text-lg font-bold">{formatCurrency(selectedPlan.price)}</span>
              </div>
            )}
            {mode === "manual" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Proof</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer flex-1">
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={uploadProof} />
                    <div className="flex h-9 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:border-gray-600 transition-colors">
                      {uploading ? "Uploading..." : proofUrl ? "✓ Proof uploaded" : <span className="flex items-center gap-2"><Upload className="h-4 w-4" />Upload receipt/screenshot</span>}
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <p className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                You&apos;ll be taken to SlickPay&apos;s secure page to enter your card details. We never see your card number. Your subscription activates as soon as the payment clears.
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewOpen(false)}>Cancel</Button>
            {mode === "online" ? (
              <Button onClick={() => checkoutMutation.mutate()} loading={checkoutMutation.isPending} disabled={!selectedPlanId}>
                <CreditCard className="me-2 h-4 w-4" />
                {selectedPlan ? `Pay ${formatCurrency(selectedPlan.price)}` : "Pay by card"}
              </Button>
            ) : (
              <Button onClick={() => renewMutation.mutate()} loading={renewMutation.isPending} disabled={!selectedPlanId}>Submit Payment</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
