"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/shared/pagination";

const TYPE_ICONS: Record<string, any> = { info: Info, success: CheckCircle, warning: AlertTriangle, error: XCircle };
const TYPE_COLORS: Record<string, string> = { info: "text-blue-500", success: "text-green-500", warning: "text-amber-500", error: "text-red-500" };

export default function PlayerNotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => fetch(`/api/notifications?page=${page}&perPage=20`).then((r) => r.json()),
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readAllMutation = useMutation({
    mutationFn: () => fetch("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => { toast.success("All marked as read"); qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
        <Button variant="outline" size="sm" onClick={() => readAllMutation.mutate()} loading={readAllMutation.isPending}>
          <CheckCheck className="me-1.5 h-4 w-4" />Mark All Read
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>
      ) : data?.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16"><Bell className="h-12 w-12 text-gray-300 mb-3" /><p className="text-gray-400">No notifications</p></div>
      ) : (
        <div className="space-y-2">
          {data?.data?.map((n: any) => {
            const Icon = TYPE_ICONS[n.type] ?? Info;
            return (
              <div key={n.id} onClick={() => !n.isRead && readMutation.mutate(n.id)} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors", n.isRead ? "border-gray-100 dark:border-gray-800" : "border-blue-100 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10")}>
                <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", n.isRead ? "bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-900 shadow-sm")}>
                  <Icon className={cn("h-4 w-4", TYPE_COLORS[n.type] ?? "text-gray-400")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.isRead && <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
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
