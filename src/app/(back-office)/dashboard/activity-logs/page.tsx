"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { timeAgo, getInitials } from "@/lib/utils";
import { Activity } from "lucide-react";

const MODULES = ["leads", "players", "subscriptions", "payments", "store", "orders", "settings", "users"];
const ACTIONS = ["create", "update", "delete", "approve", "reject", "convert", "status_change"];
const ACTION_COLORS: Record<string, string> = { create: "success", update: "default", delete: "destructive", approve: "success", reject: "destructive", convert: "default", status_change: "warning" };

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["activity-logs", page, search, module, action],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), perPage: "30" });
      if (search) p.set("q", search);
      if (module && module !== "all") p.set("module", module);
      if (action && action !== "all") p.set("action", action);
      return fetch(`/api/activity-logs?${p}`).then((r) => r.json());
    },
  });

  const columns = [
    { key: "user", header: "User", cell: (r: any) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{getInitials(r.user?.name ?? "?")}</AvatarFallback></Avatar>
        <span className="text-sm">{r.user?.name ?? "System"}</span>
      </div>
    )},
    { key: "action", header: "Action", cell: (r: any) => <Badge variant={ACTION_COLORS[r.action] as any ?? "secondary"}>{r.action}</Badge> },
    { key: "module", header: "Module", cell: (r: any) => <Badge variant="outline">{r.module}</Badge> },
    { key: "description", header: "Description", cell: (r: any) => <span className="text-sm text-gray-700 dark:text-gray-300">{r.description}</span> },
    { key: "time", header: "Time", cell: (r: any) => <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Activity Logs" description="Track all actions in the system" />

      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search logs..." className="w-64" />
        <Select value={module} onValueChange={(v) => { setModule(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No activity logs" emptyIcon={<Activity className="h-8 w-8" />} />
      {data?.totalPages > 1 && <Pagination page={page} totalPages={data.totalPages} total={data.total} perPage={30} onPageChange={setPage} />}
    </div>
  );
}
