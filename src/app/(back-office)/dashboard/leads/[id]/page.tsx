"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronRight, ArrowRight, User, Phone, Mail, MapPin, Calendar,
  Tag, UserCheck, CheckCircle2, Circle, FileText, PhoneCall,
  MailOpen, ClipboardList, Paperclip, Archive, RefreshCw,
  Loader2, AlertTriangle, Plus, X, ChevronDown,
} from "lucide-react";
import { formatDate, timeAgo } from "@/lib/utils";

interface LeadStatus {
  id: string; name: string; color: string; order: number; isDefault: boolean; isTerminal: boolean;
}

interface Lead {
  id: string; fullName: string; phone?: string; email?: string;
  dateOfBirth?: string; age?: number; parentName?: string; parentPhone?: string;
  address?: string; categoryInterest?: string; notes?: string; source?: string;
  statusId?: string; status?: LeadStatus; assignedStaffId?: string;
  assignedStaff?: { id: string; name: string; email: string };
  isConverted: boolean; convertedAt?: string; createdAt: string; updatedAt: string;
}

interface Activity {
  id: string; leadId: string; actionType: string; description: string;
  performedByName: string; performedByRole: string; metadata?: Record<string, unknown>;
  createdAt: string;
}

const ACTION_TYPES = [
  { key: "all",             label: "All" },
  { key: "status_change",   label: "Status" },
  { key: "note_added",      label: "Notes" },
  { key: "call_logged",     label: "Calls" },
  { key: "email_sent",      label: "Emails" },
  { key: "task_created",    label: "Tasks" },
  { key: "field_edited",    label: "Edits" },
  { key: "lead_converted",  label: "Convert" },
];

function getActionIcon(type: string) {
  const cls = "w-4 h-4";
  switch (type) {
    case "status_change":   return <ArrowRight className={cls} />;
    case "lead_created":    return <Plus className={cls} />;
    case "lead_assigned":   return <UserCheck className={cls} />;
    case "lead_reassigned": return <RefreshCw className={cls} />;
    case "note_added":      return <FileText className={cls} />;
    case "call_logged":     return <PhoneCall className={cls} />;
    case "email_sent":      return <MailOpen className={cls} />;
    case "task_created":    return <ClipboardList className={cls} />;
    case "task_completed":  return <CheckCircle2 className={cls} />;
    case "field_edited":    return <Circle className={cls} />;
    case "file_attached":   return <Paperclip className={cls} />;
    case "lead_converted":  return <CheckCircle2 className={cls} />;
    case "lead_archived":   return <Archive className={cls} />;
    default:                return <Circle className={cls} />;
  }
}

function getActionColor(type: string): string {
  switch (type) {
    case "status_change":   return "#3B82F6";
    case "lead_created":    return "#10B981";
    case "lead_assigned":
    case "lead_reassigned": return "#8B5CF6";
    case "note_added":      return "#F59E0B";
    case "call_logged":     return "#06B6D4";
    case "email_sent":      return "#EC4899";
    case "task_created":
    case "task_completed":  return "#F97316";
    case "lead_converted":  return "#10B981";
    case "lead_archived":   return "#EF4444";
    default:                return "#6B7280";
  }
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: hexToRgba(status.color, 0.15), color: status.color, border: `1px solid ${hexToRgba(status.color, 0.35)}` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: status.color }} />
      {status.name}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    admin:  { bg: "#FEE2E2", text: "#A02020" },
    agent:  { bg: "#EFF6FF", text: "#1D4ED8" },
    system: { bg: "#F3F4F6", text: "#6B7280" },
  };
  const c = colors[role] ?? colors.system;
  return (
    <span className="text-xs font-semibold px-1.5 py-0.5 rounded capitalize" style={{ background: c.bg, color: c.text }}>
      {role}
    </span>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"info" | "activity">("info");
  const [activityFilter, setActivityFilter] = useState("all");
  const [activityPage, setActivityPage] = useState(1);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [quickStatusId, setQuickStatusId] = useState("");
  const [showStatusDrop, setShowStatusDrop] = useState(false);

  const { data: lead, isLoading: leadLoading } = useQuery<Lead>({
    queryKey: ["lead", id],
    queryFn: () => fetch(`/api/leads/${id}`).then((r) => r.json()),
  });

  const { data: statuses } = useQuery<LeadStatus[]>({
    queryKey: ["lead-statuses"],
    queryFn: () => fetch("/api/lead-statuses").then((r) => r.json()),
  });

  const activityQuery = useQuery<{ data: Activity[]; total: number; totalPages: number }>({
    queryKey: ["lead-activity", id, activityFilter, activityPage],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(activityPage), perPage: "20" });
      if (activityFilter !== "all") params.set("actionType", activityFilter);
      return fetch(`/api/leads/${id}/activity?${params}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (lead?.statusId) setQuickStatusId(lead.statusId);
  }, [lead?.statusId]);

  const statusChangeMutation = useMutation({
    mutationFn: (statusId: string) =>
      fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, statusId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      qc.invalidateQueries({ queryKey: ["lead-activity", id] });
      setShowStatusDrop(false);
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const addNoteMutation = useMutation({
    mutationFn: (note: string) =>
      fetch(`/api/leads/${id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "note_added",
          description: `Note added: ${note.slice(0, 60)}${note.length > 60 ? "..." : ""}`,
          metadata: { note },
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-activity", id] });
      setNoteText(""); setAddingNote(false);
      toast.success("Note added");
    },
    onError: () => toast.error("Failed to add note"),
  });

  const convertMutation = useMutation({
    mutationFn: () => fetch(`/api/leads/${id}/convert`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      toast.success("Lead converted to player");
    },
    onError: () => toast.error("Conversion failed"),
  });

  const handleStatusChange = useCallback((statusId: string) => {
    setQuickStatusId(statusId);
    statusChangeMutation.mutate(statusId);
  }, [statusChangeMutation]);

  if (leadLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} /></div>;
  }

  if (!lead || (lead as unknown as { error: string }).error) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
        <p className="font-medium" style={{ color: "var(--text-primary)" }}>Lead not found</p>
        <Link href="/dashboard/leads" className="text-sm mt-2 block" style={{ color: "#A02020" }}>Back to Leads</Link>
      </div>
    );
  }

  const currentStatus = statuses?.find((s) => s.id === lead.statusId);
  const sortedStatuses = [...(statuses ?? [])].sort((a, b) => a.order - b.order);
  const activities = activityQuery.data?.data ?? [];

  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) => (
    value ? (
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{value}</p>
        </div>
      </div>
    ) : null
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/leads" className="hover:underline">Leads</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span style={{ color: "var(--text-primary)" }}>{lead.fullName}</span>
      </div>

      {/* Header */}
      <div className="rounded-2xl p-6" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0" style={{ background: "#A02020" }}>
            {lead.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{lead.fullName}</h1>
              {lead.isConverted && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "#D1FAE5", color: "#065F46" }}>Converted</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {currentStatus && <StatusBadge status={currentStatus} />}
              {lead.source && <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--muted-bg)", color: "var(--text-muted)" }}>{lead.source}</span>}
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Added {formatDate(lead.createdAt)}</span>
            </div>
          </div>

          {/* Quick status change */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative">
              <button
                onClick={() => setShowStatusDrop((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "var(--muted-bg)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}>
                Move to <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showStatusDrop && (
                <div className="absolute right-0 top-full mt-1 z-20 rounded-xl shadow-xl py-1 min-w-[180px]"
                  style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                  {sortedStatuses.map((s) => (
                    <button key={s.id} onClick={() => handleStatusChange(s.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:opacity-80 transition-colors"
                      style={{ color: s.id === lead.statusId ? s.color : "var(--text-primary)" }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      {s.name}
                      {s.id === lead.statusId && <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>current</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!lead.isConverted && (
              <button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: "#10B981" }}>
                {convertMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Convert
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--muted-bg)" }}>
        {(["info", "activity"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all"
            style={activeTab === tab
              ? { background: "var(--card)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
              : { color: "var(--text-muted)" }}>
            {tab === "activity" ? `Activity${activityQuery.data ? ` (${activityQuery.data.total})` : ""}` : "Info"}
          </button>
        ))}
      </div>

      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: contact info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Contact Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Phone} label="Phone" value={lead.phone} />
                <InfoRow icon={Mail} label="Email" value={lead.email} />
                <InfoRow icon={User} label="Parent Name" value={lead.parentName} />
                <InfoRow icon={Phone} label="Parent Phone" value={lead.parentPhone} />
                <InfoRow icon={Calendar} label="Date of Birth" value={lead.dateOfBirth ? formatDate(lead.dateOfBirth) : null} />
                <InfoRow icon={Tag} label="Category" value={lead.categoryInterest} />
                <InfoRow icon={MapPin} label="Address" value={lead.address} />
              </div>
            </div>

            {lead.notes && (
              <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>Notes</h2>
                <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-primary)" }}>{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Right: meta */}
          <div className="space-y-4">
            <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Details</h2>
              {currentStatus && (
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Status</p>
                  <StatusBadge status={currentStatus} />
                </div>
              )}
              {lead.assignedStaff && (
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Assigned To</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#8B5CF6" }}>
                      {lead.assignedStaff.name?.[0]}
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{lead.assignedStaff.name}</span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Created</p>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>{formatDate(lead.createdAt)}</p>
              </div>
              {lead.isConverted && lead.convertedAt && (
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Converted</p>
                  <p className="text-sm" style={{ color: "#10B981" }}>{formatDate(lead.convertedAt)}</p>
                </div>
              )}
            </div>

            <Link href={`/dashboard/leads?edit=${lead.id}`}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ border: "1px solid var(--card-border)", color: "var(--text-primary)" }}>
              Edit Lead Info
            </Link>
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-4">
          {/* Filter + Add note */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ background: "var(--muted-bg)" }}>
              {ACTION_TYPES.map((t) => (
                <button key={t.key} onClick={() => { setActivityFilter(t.key); setActivityPage(1); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={activityFilter === t.key
                    ? { background: "var(--card)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                    : { color: "var(--text-muted)" }}>
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={() => setAddingNote(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white ml-auto"
              style={{ background: "#A02020" }}>
              <Plus className="w-3.5 h-3.5" /> Add Note
            </button>
          </div>

          {/* Note input */}
          {addingNote && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <textarea
                autoFocus
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                placeholder="Write a note about this lead..."
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setAddingNote(false); setNoteText(""); }}
                  className="p-1.5 rounded-lg" style={{ border: "1px solid var(--card-border)", color: "var(--text-muted)" }}>
                  <X className="w-4 h-4" />
                </button>
                <button onClick={() => noteText.trim() && addNoteMutation.mutate(noteText.trim())}
                  disabled={!noteText.trim() || addNoteMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                  style={{ background: "#A02020" }}>
                  {addNoteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save Note
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          {activityQuery.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} /></div>
          ) : activities.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ border: "1px dashed var(--card-border)" }}>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No activity yet for this filter.</p>
            </div>
          ) : (
            <div className="relative space-y-0">
              <div className="absolute left-[22px] top-0 bottom-0 w-px" style={{ background: "var(--card-border)" }} />
              {activities.map((a) => {
                const color = getActionColor(a.actionType);
                return (
                  <div key={a.id} className="relative flex gap-4 pb-5">
                    <div className="relative z-10 flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ background: hexToRgba(color, 0.12), border: `2px solid ${hexToRgba(color, 0.3)}`, color }}>
                      {getActionIcon(a.actionType)}
                    </div>
                    <div className="flex-1 min-w-0 pt-1 pb-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium leading-snug" style={{ color: "var(--text-primary)" }}>{a.description}</p>
                        <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}
                          title={formatDate(a.createdAt)}>
                          {timeAgo(a.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{a.performedByName}</span>
                        <RoleBadge role={a.performedByRole} />
                      </div>
                      {a.metadata && a.actionType === "note_added" && (a.metadata as Record<string, string>).note && (
                        <div className="mt-2 rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
                          style={{ background: "var(--muted-bg)", color: "var(--text-secondary)" }}>
                          {(a.metadata as Record<string, string>).note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more */}
          {activityQuery.data && activityPage < activityQuery.data.totalPages && (
            <button onClick={() => setActivityPage((p) => p + 1)}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ border: "1px solid var(--card-border)", color: "var(--text-muted)" }}>
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
