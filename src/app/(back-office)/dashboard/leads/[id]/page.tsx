"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronRight, ArrowRight, User, Phone, Mail, MapPin, Calendar,
  Tag, UserCheck, CheckCircle2, Circle, FileText, PhoneCall,
  MailOpen, ClipboardList, Paperclip, Archive, RefreshCw,
  Loader2, AlertTriangle, Plus, X,
} from "lucide-react";
import { formatDate, timeAgo } from "@/lib/utils";
import { StatusBadge, type LeadStatus } from "@/components/leads/status-badge";
import { BookingModal } from "@/components/calendar/booking-modal";
import { useTranslation } from "react-i18next";

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
  { key: "all",            tKey: "activity.all" },
  { key: "status_change",  tKey: "activity.status" },
  { key: "note_added",     tKey: "activity.notes" },
  { key: "call_logged",    tKey: "activity.calls" },
  { key: "email_sent",     tKey: "activity.emails" },
  { key: "task_created",   tKey: "activity.tasks" },
  { key: "field_edited",   tKey: "activity.edits" },
  { key: "lead_converted", tKey: "activity.convert" },
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
  const { t: tl } = useTranslation("leads");
  const { t: tc } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"info" | "activity" | "notes">("info");
  const [activityFilter, setActivityFilter] = useState("all");
  const [activityPage, setActivityPage] = useState(1);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  // Auto-open booking modal when status changes to "Meeting booked" on this lead
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ leadId: string }>;
      if (ce.detail.leadId === id) setBookingOpen(true);
    };
    document.addEventListener("lead-meeting-booked", handler);
    return () => document.removeEventListener("lead-meeting-booked", handler);
  }, [id]);

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
      toast.success(tl("notes.saved"));
    },
    onError: () => toast.error(tl("notes.failed")),
  });

  interface LeadNote {
    id: string; leadId: string; content: string;
    createdByName: string; createdByRole: string; createdAt: string;
  }

  const notesQuery = useQuery<LeadNote[]>({
    queryKey: ["lead-notes", id],
    queryFn: () => fetch(`/api/leads/${id}/notes`).then((r) => r.json()),
    enabled: activeTab === "notes",
  });

  const [newNoteText, setNewNoteText] = useState("");
  const addLeadNoteMutation = useMutation({
    mutationFn: (content: string) =>
      fetch(`/api/leads/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-notes", id] });
      setNewNoteText("");
      toast.success(tl("notes.saved"));
    },
    onError: () => toast.error(tl("notes.failed")),
  });

  const convertMutation = useMutation({
    mutationFn: () => fetch(`/api/leads/${id}/convert`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      qc.invalidateQueries({ queryKey: ["lead-activity", id] });
      toast.success(tl("convert.success"));
    },
    onError: () => toast.error(tl("convert.failed")),
  });

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
        <Link href="/dashboard/leads" className="hover:underline">{tl("title")}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span style={{ color: "var(--text-primary)" }}>{lead.fullName}</span>
      </div>

      {/* Header card */}
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
              {/* Clickable status badge — opens inline dropdown */}
              <StatusBadge
                leadId={lead.id}
                leadName={lead.fullName}
                currentStatus={currentStatus}
                statuses={statuses ?? []}
                onStatusChange={() => {
                  qc.invalidateQueries({ queryKey: ["lead", id] });
                  qc.invalidateQueries({ queryKey: ["lead-activity", id] });
                }}
              />
              {lead.source && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--muted-bg)", color: "var(--text-muted)" }}>
                  {lead.source}
                </span>
              )}
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Added {formatDate(lead.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={() => setBookingOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "#3B82F6" }}
            >
              <PhoneCall className="w-3.5 h-3.5" /> {tl("actions.book_call")}
            </button>
            {!lead.isConverted && (
              <button
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: "#10B981" }}
              >
                {convertMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {tl("actions.convert_to_player")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--muted-bg)" }}>
        {(["info", "activity", "notes"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all"
            style={activeTab === tab
              ? { background: "var(--card)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
              : { color: "var(--text-muted)" }}>
            {tab === "activity" ? `${tl("activity.title")}${activityQuery.data ? ` (${activityQuery.data.total})` : ""}` : tab === "notes" ? `${tl("notes.title")}${notesQuery.data ? ` (${notesQuery.data.length})` : ""}` : tl("detail.details")}
          </button>
        ))}
      </div>

      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>{tl("detail.contact_info")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Phone} label={tl("form.phone")} value={lead.phone} />
                <InfoRow icon={Mail} label={tl("form.email")} value={lead.email} />
                <InfoRow icon={User} label={tl("form.parent_name")} value={lead.parentName} />
                <InfoRow icon={Phone} label={tl("form.parent_phone")} value={lead.parentPhone} />
                <InfoRow icon={Calendar} label={tl("form.date_of_birth")} value={lead.dateOfBirth ? formatDate(lead.dateOfBirth) : null} />
                <InfoRow icon={Tag} label={tl("form.category")} value={lead.categoryInterest} />
                <InfoRow icon={MapPin} label={tl("form.address")} value={lead.address} />
              </div>
            </div>
            {lead.notes && (
              <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>Notes</h2>
                <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-primary)" }}>{lead.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>{tl("detail.details")}</h2>
              {currentStatus && (
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{tc("labels.status")}</p>
                  <StatusBadge
                    leadId={lead.id}
                    leadName={lead.fullName}
                    currentStatus={currentStatus}
                    statuses={statuses ?? []}
                    onStatusChange={() => qc.invalidateQueries({ queryKey: ["lead", id] })}
                  />
                </div>
              )}
              {lead.assignedStaff && (
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{tc("labels.assigned_to")}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#8B5CF6" }}>
                      {lead.assignedStaff.name?.[0]}
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{lead.assignedStaff.name}</span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{tc("labels.created_at")}</p>
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
              {tl("detail.edit_lead")}
            </Link>
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ background: "var(--muted-bg)" }}>
              {ACTION_TYPES.map((at) => (
                <button key={at.key} onClick={() => { setActivityFilter(at.key); setActivityPage(1); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={activityFilter === at.key
                    ? { background: "var(--card)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                    : { color: "var(--text-muted)" }}>
                  {tl(at.tKey)}
                </button>
              ))}
            </div>
            <button onClick={() => setAddingNote(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white ms-auto"
              style={{ background: "#A02020" }}>
              <Plus className="w-3.5 h-3.5" /> {tl("actions.add_note")}
            </button>
          </div>

          {addingNote && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <textarea
                autoFocus
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                placeholder={tl("notes.placeholder")}
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
                  {addNoteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {tl("actions.save_note")}
                </button>
              </div>
            </div>
          )}

          {activityQuery.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} /></div>
          ) : activities.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ border: "1px dashed var(--card-border)" }}>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{tl("activity.no_activity")}</p>
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
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium leading-snug" style={{ color: "var(--text-primary)" }}>{a.description}</p>
                        <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }} title={formatDate(a.createdAt)}>
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

          {activityQuery.data && activityPage < activityQuery.data.totalPages && (
            <button onClick={() => setActivityPage((p) => p + 1)}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ border: "1px solid var(--card-border)", color: "var(--text-muted)" }}>
              {tc("actions.load_more")}
            </button>
          )}
        </div>
      )}

      {activeTab === "notes" && (
        <div className="space-y-4 max-w-3xl">
          {/* New note input */}
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
            <textarea
              autoFocus
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
              placeholder={tl("notes.placeholder")}
            />
            <div className="flex justify-end">
              <button
                onClick={() => newNoteText.trim() && addLeadNoteMutation.mutate(newNoteText.trim())}
                disabled={!newNoteText.trim() || addLeadNoteMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "#A02020" }}>
                {addLeadNoteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {tl("actions.save_note")}
              </button>
            </div>
          </div>

          {/* Notes list */}
          {notesQuery.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} /></div>
          ) : (notesQuery.data ?? []).length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ border: "1px dashed var(--card-border)" }}>
              <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{tl("notes.empty_title")}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{tl("notes.empty_subtitle")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notesQuery.data!.map((note) => (
                <div key={note.id} className="rounded-2xl p-4 space-y-2" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: "#8B5CF6" }}>
                      {note.createdByName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{note.createdByName}</span>
                        <RoleBadge role={note.createdByRole} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo(note.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap ps-9" style={{ color: "var(--text-primary)" }}>{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        prefilledLeadId={lead.id}
        prefilledLeadName={lead.fullName}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["lead", id] });
          qc.invalidateQueries({ queryKey: ["lead-activity", id] });
        }}
      />
    </div>
  );
}
