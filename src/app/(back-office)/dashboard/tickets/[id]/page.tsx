"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Send, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate, timeAgo } from "@/lib/utils";
import Link from "next/link";
import { useTranslation } from "react-i18next";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

interface Comment { id: string; body: string; author: { id: string; name: string | null; email: string }; createdAt: string }
interface FullTicket {
  id: string; title: string; description: string; status: string; priority: string;
  createdBy: { id: string; name: string | null; email: string };
  assignedTo: { id: string; name: string | null; email: string } | null;
  comments: Comment[]; createdAt: string; updatedAt: string;
}

export default function TicketDetailPage() {
  const { t } = useTranslation("tickets");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: ticket, isLoading } = useQuery<FullTicket>({
    queryKey: ["ticket", id],
    queryFn: () => fetch(`/api/tickets/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-list"],
    queryFn: () => fetch("/api/users?perPage=100").then((r) => r.json()).then((d) => d.data ?? d),
  });

  const { mutate: updateTicket } = useMutation({
    mutationFn: (patch: Record<string, string | null>) =>
      fetch(`/api/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("common:toast.updated")); qc.invalidateQueries({ queryKey: ["ticket", id] }); qc.invalidateQueries({ queryKey: ["tickets"] }); },
    onError: () => toast.error(t("common:toast.failed")),
  });

  const { mutate: addComment, isPending: commenting } = useMutation({
    mutationFn: (body: string) =>
      fetch(`/api/tickets/${id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      setComment("");
      qc.invalidateQueries({ queryKey: ["ticket", id] });
    },
    onError: () => toast.error(t("common:toast.failed")),
  });

  const { mutate: deleteTicket, isPending: deleting } = useMutation({
    mutationFn: () => fetch(`/api/tickets/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("detail.deleted")); router.push("/dashboard/tickets"); },
    onError: () => toast.error(t("common:toast.failed")),
  });

  if (isLoading) return <div className="text-center py-20 text-gray-500">{t("common:ui.loading")}</div>;
  if (!ticket || (ticket as { error?: string }).error) return <div className="text-center py-20 text-gray-400">{t("detail.not_found")}</div>;

  const staffList = Array.isArray(staff) ? staff : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/tickets" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t("detail.back")}
        </Link>
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="w-4 h-4 mr-1" /> {t("common:ui.delete")}
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex-1">{ticket.title}</h1>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[ticket.status] ?? ""}`}>{ticket.status.replace("_", " ")}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>{ticket.priority}</span>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap mb-4">{ticket.description}</p>

        <div className="text-xs text-gray-400 space-y-1">
          <p>{t("detail.created_by")} <span className="font-medium">{ticket.createdBy.name ?? ticket.createdBy.email}</span> · {formatDate(ticket.createdAt)}</p>
          {ticket.assignedTo && <p>{t("detail.assigned_to")} <span className="font-medium">{ticket.assignedTo.name ?? ticket.assignedTo.email}</span></p>}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">{t("detail.manage")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t("common:ui.status")}</label>
            <Select value={ticket.status} onValueChange={(v) => updateTicket({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">{t("common:status.open")}</SelectItem>
                <SelectItem value="in_progress">{t("common:status.in_progress")}</SelectItem>
                <SelectItem value="resolved">{t("common:status.resolved")}</SelectItem>
                <SelectItem value="closed">{t("common:status.closed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t("common:ui.priority")}</label>
            <Select value={ticket.priority} onValueChange={(v) => updateTicket({ priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("common:priority.low")}</SelectItem>
                <SelectItem value="medium">{t("common:priority.medium")}</SelectItem>
                <SelectItem value="high">{t("common:priority.high")}</SelectItem>
                <SelectItem value="urgent">{t("common:priority.urgent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t("common:ui.assigned_to")}</label>
            <Select value={ticket.assignedTo?.id ?? "unassigned"} onValueChange={(v) => updateTicket({ assignedToId: v === "unassigned" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">{t("common:ui.unassigned")}</SelectItem>
                {staffList.map((u: { id: string; name: string | null; email: string }) => (
                  <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Comments ({ticket.comments.length})
        </h2>

        {ticket.comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">{t("detail.no_comments")}</p>
        ) : (
          <div className="space-y-4 mb-6">
            {ticket.comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{c.author.name ?? c.author.email}</span>
                    <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("detail.comment_ph")}
            rows={3}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && comment.trim()) addComment(comment.trim()); }}
            className="flex-1"
          />
          <Button onClick={() => comment.trim() && addComment(comment.trim())} disabled={commenting || !comment.trim()} className="self-end">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1">{t("detail.submit_hint")}</p>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("detail.delete")}
        description={t("detail.delete_body")}
        onConfirm={() => deleteTicket()}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
