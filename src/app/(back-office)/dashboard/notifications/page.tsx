"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { timeAgo } from "@/lib/utils";
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, any> = { info: Info, success: CheckCircle, warning: AlertTriangle, error: XCircle };
const TYPE_COLORS: Record<string, string> = { info: "text-blue-500", success: "text-green-500", warning: "text-amber-500", error: "text-red-500" };

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => fetch(`/api/notifications?page=${page}&perPage=20`).then((r) => r.json()),
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  const readAllMutation = useMutation({
    mutationFn: () => fetch("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => { toast.success("All marked as read"); qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  const notifications = data?.data ?? [];
  const filtered = filter === "unread" ? notifications.filter((n: any) => !n.isRead) : notifications;

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" description="Stay up to date with academy activity">
        <Button variant="outline" onClick={() => readAllMutation.mutate()} loading={readAllMutation.isPending} disabled={!notifications.some((n: any) => !n.isRead)}>
          <CheckCheck className="me-2 h-4 w-4" />Mark All Read
        </Button>
      </PageHeader>

      <div className="flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">{f}</Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {filtered.map((n: any) => {
            const Icon = TYPE_ICONS[n.type] ?? Info;
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && readMutation.mutate(n.id)}
                className={cn("flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50", n.isRead ? "border-gray-100 dark:border-gray-800" : "border-blue-100 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10")}
              >
                <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", n.isRead ? "bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-900 shadow-sm")}>
                  <Icon className={cn("h-4 w-4", TYPE_COLORS[n.type] ?? "text-gray-400")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-medium", !n.isRead && "text-gray-900 dark:text-gray-100")}>{n.title}</p>
                    {!n.isRead && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {data?.totalPages > 1 && <Pagination page={page} totalPages={data.totalPages} total={data.total} perPage={20} onPageChange={setPage} />}
    </div>
  );
}
