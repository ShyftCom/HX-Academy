"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, formatCurrency, getInitials, timeAgo } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import { CreditCard, ShoppingBag, Bell, AlertTriangle, CheckCircle, Info, Circle, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { FullPageLoader } from "@/components/shared/loading-spinner";

/** One line of the "finish your registration" checklist. */
function OnboardingStep({ done, title, hint, href, cta, icon: Icon }: { done: boolean; title: string; hint: string; href: string; cta: string; icon: React.ElementType }) {
  return (
    <div className="flex items-start gap-3">
      {done
        ? <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
        : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${done ? "text-gray-400 line-through" : "text-gray-900 dark:text-gray-100"}`}>{title}</p>
        {!done && <p className="text-xs text-gray-500">{hint}</p>}
        {!done && (
          <Link href={href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
            <Icon className="h-3.5 w-3.5" />{cta}<ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PlayerHomePage() {
  const { data: session } = useSession();
  const playerId = (session?.user as any)?.playerId;

  const { data: player, isLoading } = useQuery({
    queryKey: ["player-profile", playerId],
    queryFn: () => fetch(`/api/players/${playerId}`).then((r) => r.json()),
    enabled: !!playerId,
  });

  const { data: notifications } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => fetch("/api/notifications?perPage=5").then((r) => r.json()),
  });

  const { data: docs } = useQuery({
    queryKey: ["player-documents"],
    queryFn: () => fetch("/api/player/documents").then((r) => r.json()),
  });

  if (isLoading || !playerId) return <FullPageLoader />;

  const activeSub = player?.subscriptions?.find((s: any) => s.status === "active");
  const daysLeft = activeSub?.endDate ? differenceInDays(parseISO(activeSub.endDate), new Date()) : null;
  const recentOrders = player?.orders?.slice(0, 3) ?? [];
  const recentPayments = player?.payments?.slice(0, 3) ?? [];

  // Registration finishes here, in the portal, not on the public form: pick a
  // plan and pay for it, then hand over the paperwork.
  const requiredDocs = (docs?.requirements ?? []).filter((r: any) => r.isRequired);
  const uploadedRequirementIds = new Set((docs?.documents ?? []).map((d: any) => d.requirementId));
  const docsDone = requiredDocs.length > 0 && requiredDocs.every((r: any) => uploadedRequirementIds.has(r.id));
  const paymentPending = player?.payments?.some((p: any) => p.status === "pending") ?? false;
  const onboardingComplete = Boolean(activeSub) && (requiredDocs.length === 0 || docsDone);


  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={player?.photo ?? ""} />
              <AvatarFallback className="text-lg">{getInitials(player?.fullName ?? "P")}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{player?.fullName}</h2>
              <p className="text-sm text-gray-500">{player?.category ?? "Player"} {player?.team ? `· ${player.team}` : ""}</p>
              <Badge variant={player?.status === "active" ? "success" : "destructive"} className="mt-1">{player?.status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finish registration — hidden once there is nothing left to do */}
      {!onboardingComplete && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Finish your registration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <OnboardingStep
              done={Boolean(activeSub)}
              title="Choose your plan and pay"
              hint={paymentPending ? "Your payment is with the team for approval." : "Pay by card, or upload a transfer receipt for approval."}
              href="/player/subscriptions"
              cta="Choose a plan"
              icon={CreditCard}
            />
            <OnboardingStep
              done={requiredDocs.length === 0 || docsDone}
              title="Upload your documents"
              hint={`${requiredDocs.filter((r: any) => uploadedRequirementIds.has(r.id)).length} of ${requiredDocs.length} uploaded`}
              href="/player/documents"
              cta="Upload documents"
              icon={FileText}
            />
          </CardContent>
        </Card>
      )}

      {/* Subscription Status */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" />Subscription</CardTitle></CardHeader>
        <CardContent>
          {activeSub ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold">{activeSub.plan?.name}</p>
                  <p className="text-xs text-gray-400">Expires: {formatDate(activeSub.endDate)}</p>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              {daysLeft !== null && (
                <div className={`flex items-center gap-2 rounded-lg p-2 text-sm ${daysLeft <= 7 ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"}`}>
                  {daysLeft <= 7 ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle className="h-4 w-4 shrink-0" />}
                  <span>{daysLeft <= 0 ? "Subscription expired" : daysLeft <= 7 ? `${daysLeft} days remaining — renew soon!` : `${daysLeft} days remaining`}</span>
                </div>
              )}
              <Link href="/player/subscriptions" className="mt-3 block text-center text-sm text-blue-600 hover:underline">Manage Subscription →</Link>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500 mb-3">No active subscription</p>
              <Link href="/player/subscriptions" className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Subscribe Now</Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      {notifications?.data?.filter((n: any) => !n.isRead).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4" />Notifications</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.data.filter((n: any) => !n.isRead).slice(0, 3).map((n: any) => (
                <div key={n.id} className="flex items-start gap-2 rounded-lg bg-blue-50 p-2.5 dark:bg-blue-900/20">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-gray-500">{n.message}</p><p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p></div>
                </div>
              ))}
            </div>
            <Link href="/player/notifications" className="mt-3 block text-center text-sm text-blue-600 hover:underline">View all →</Link>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShoppingBag className="h-4 w-4" />Recent Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentOrders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <div><p className="font-medium">#{o.orderNumber}</p><p className="text-xs text-gray-400">{formatDate(o.createdAt)}</p></div>
                  <div className="text-end"><p className="font-medium">{formatCurrency(o.totalAmount)}</p><p className="text-xs text-gray-400">{o.status?.name ?? "Processing"}</p></div>
                </div>
              ))}
            </div>
            <Link href="/player/orders" className="mt-3 block text-center text-sm text-blue-600 hover:underline">View all orders →</Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
