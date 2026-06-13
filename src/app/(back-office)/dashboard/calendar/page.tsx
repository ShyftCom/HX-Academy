"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Plus, Calendar, Users, Clock,
  Loader2, X, Check, AlertTriangle,
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, isSameDay, isSameMonth, getDay, startOfDay } from "date-fns";
import { toast } from "sonner";
import { BookingModal } from "@/components/calendar/booking-modal";

interface Meeting {
  id: string;
  leadId: string;
  leadName: string;
  agentId: string;
  agentName: string;
  date: string;
  time: string;
  durationMinutes: number;
  type: string;
  notes?: string;
  status: string;
  agent: { id: string; name: string | null; image: string | null };
  lead: { id: string; fullName: string };
}

const AGENT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F97316", "#10B981",
  "#06B6D4", "#EF4444", "#84CC16", "#F59E0B", "#6366F1",
];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3B82F6",
  completed: "#10B981",
  cancelled: "#EF4444",
  no_show: "#F59E0B",
};

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function CalendarPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const [view, setView] = useState<"week" | "month">("week");
  const [calView, setCalView] = useState<"my" | "team">("my");
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Week range
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const fromDate = format(weekStart, "yyyy-MM-dd");
  const toDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

  // Month range
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const fromMonth = format(monthStart, "yyyy-MM-dd");
  const toMonth = format(monthEnd, "yyyy-MM-dd");

  const from = view === "week" ? fromDate : fromMonth;
  const to = view === "week" ? toDate : toMonth;

  const agentId = calView === "my" ? session?.user?.id : undefined;

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["meetings", agentId, from, to],
    queryFn: () => {
      const params = new URLSearchParams({ from, to });
      if (agentId) params.set("agent_id", agentId);
      return fetch(`/api/meetings?${params}`).then((r) => r.json());
    },
    enabled: !!session?.user?.id,
  });

  // Agent color map
  const agentColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    for (const m of meetings) {
      if (!map.has(m.agentId)) {
        map.set(m.agentId, AGENT_COLORS[i % AGENT_COLORS.length]);
        i++;
      }
    }
    return map;
  }, [meetings]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting status updated");
      setSelectedMeeting(null);
    },
    onError: () => toast.error("Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/meetings/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting deleted");
      setSelectedMeeting(null);
    },
    onError: () => toast.error("Delete failed"),
  });

  function prevPeriod() {
    if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subMonths(d, 1));
  }
  function nextPeriod() {
    if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  }

  const periodLabel = view === "week"
    ? `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`
    : format(currentDate, "MMMM yyyy");

  const getMeetingsForDay = (date: Date) =>
    meetings.filter((m) => m.date === format(date, "yyyy-MM-dd"))
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  const MeetingBlock = ({ meeting, compact = false }: { meeting: Meeting; compact?: boolean }) => {
    const color = calView === "team" ? (agentColorMap.get(meeting.agentId) ?? "#6B7280") : (STATUS_COLORS[meeting.status] ?? "#6B7280");
    return (
      <button
        onClick={() => setSelectedMeeting(meeting)}
        className="w-full text-left rounded-lg px-2 py-1.5 transition-opacity hover:opacity-80"
        style={{ background: hexToRgba(color, 0.15), borderLeft: `3px solid ${color}` }}>
        <div className="text-xs font-semibold truncate" style={{ color }}>{meeting.time} · {meeting.leadName}</div>
        {!compact && <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{meeting.agentName} · {meeting.durationMinutes}m</div>}
      </button>
    );
  };

  // Month calendar grid
  const MonthGrid = () => {
    const firstDay = startOfMonth(currentDate);
    const lastDay = endOfMonth(currentDate);
    const startPad = (getDay(firstDay) + 6) % 7; // Monday-first
    const totalCells = startPad + lastDay.getDate();
    const rows = Math.ceil(totalCells / 7);
    const cells = Array.from({ length: rows * 7 }, (_, i) => {
      const dayOffset = i - startPad;
      if (dayOffset < 0 || dayOffset >= lastDay.getDate()) return null;
      return addDays(firstDay, dayOffset);
    });

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--card-border)" }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(100px, 1fr)" }}>
          {cells.map((day, i) => {
            const isToday = day ? isSameDay(day, new Date()) : false;
            const inMonth = day ? isSameMonth(day, currentDate) : false;
            const dayMeetings = day ? getMeetingsForDay(day) : [];
            return (
              <div key={i}
                className="border-b border-r p-1.5 min-h-24"
                style={{ borderColor: "var(--card-border)", opacity: inMonth ? 1 : 0.3 }}>
                {day && (
                  <>
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${isToday ? "text-white" : ""}`}
                      style={{ background: isToday ? "#A02020" : "transparent", color: isToday ? "#fff" : "var(--text-secondary)" }}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayMeetings.slice(0, 3).map((m) => <MeetingBlock key={m.id} meeting={m} compact />)}
                      {dayMeetings.length > 3 && (
                        <div className="text-[10px] font-medium px-1" style={{ color: "var(--text-muted)" }}>+{dayMeetings.length - 3} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Week grid with time axis
  const WeekGrid = () => {
    const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 08:00 – 18:00
    return (
      <div className="flex-1 overflow-auto">
        {/* Day headers */}
        <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: "60px repeat(7, 1fr)", background: "var(--card)", borderBottom: "1px solid var(--card-border)" }}>
          <div />
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className="py-2 text-center">
                <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{format(day, "EEE")}</div>
                <div className={`text-sm font-bold mx-auto w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "text-white" : ""}`}
                  style={{ background: isToday ? "#A02020" : "transparent", color: isToday ? "#fff" : "var(--text-primary)" }}>
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hour rows */}
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} className="grid" style={{ gridTemplateColumns: "60px repeat(7, 1fr)", minHeight: "64px" }}>
              <div className="text-right pr-3 pt-1">
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{hour}:00</span>
              </div>
              {weekDays.map((day) => {
                const dayMeetings = getMeetingsForDay(day).filter((m) => {
                  const h = parseInt(m.time.split(":")[0]);
                  return h === hour;
                });
                return (
                  <div key={day.toISOString()} className="border-l border-b p-0.5 space-y-0.5"
                    style={{ borderColor: "var(--card-border)" }}>
                    {dayMeetings.map((m) => <MeetingBlock key={m.id} meeting={m} />)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-shrink-0">
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Calendar</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Manage meetings and availability</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* My / Team toggle */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--muted-bg)" }}>
            <button onClick={() => setCalView("my")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={calView === "my" ? { background: "var(--card)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "var(--text-muted)" }}>
              <Calendar className="w-3.5 h-3.5" /> My Calendar
            </button>
            {isAdmin && (
              <button onClick={() => setCalView("team")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={calView === "team" ? { background: "var(--card)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "var(--text-muted)" }}>
                <Users className="w-3.5 h-3.5" /> Team
              </button>
            )}
          </div>

          {/* Week / Month toggle */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--muted-bg)" }}>
            {(["week", "month"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                style={view === v ? { background: "var(--card)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "var(--text-muted)" }}>
                {v}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button onClick={prevPeriod} className="p-1.5 rounded-lg border" style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold min-w-[160px] text-center" style={{ color: "var(--text-primary)" }}>{periodLabel}</span>
            <button onClick={nextPeriod} className="p-1.5 rounded-lg border" style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => setBookingOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#A02020" }}>
            <Plus className="w-4 h-4" /> Book Meeting
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden rounded-2xl" style={{ border: "1px solid var(--card-border)", background: "var(--card)" }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : view === "week" ? <WeekGrid /> : <MonthGrid />}
      </div>

      {/* Team legend */}
      {calView === "team" && (
        <div className="flex flex-wrap gap-3 flex-shrink-0">
          {Array.from(agentColorMap.entries()).map(([agentId, color]) => {
            const meeting = meetings.find((m) => m.agentId === agentId);
            return (
              <div key={agentId} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                {meeting?.agentName ?? agentId}
              </div>
            );
          })}
        </div>
      )}

      {/* Meeting detail panel */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--card-border)" }}>
              <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>Meeting Details</h3>
              <button onClick={() => setSelectedMeeting(null)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DetailItem label="Lead">
                  <Link href={`/dashboard/leads/${selectedMeeting.leadId}`} className="text-sm font-medium hover:underline" style={{ color: "#3B82F6" }}>
                    {selectedMeeting.leadName}
                  </Link>
                </DetailItem>
                <DetailItem label="Agent"><span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{selectedMeeting.agentName}</span></DetailItem>
                <DetailItem label="Date"><span className="text-sm" style={{ color: "var(--text-primary)" }}>{selectedMeeting.date}</span></DetailItem>
                <DetailItem label="Time"><span className="text-sm" style={{ color: "var(--text-primary)" }}>{selectedMeeting.time} · {selectedMeeting.durationMinutes}m</span></DetailItem>
                <DetailItem label="Type"><span className="text-sm capitalize" style={{ color: "var(--text-primary)" }}>{selectedMeeting.type}</span></DetailItem>
                <DetailItem label="Status">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: hexToRgba(STATUS_COLORS[selectedMeeting.status] ?? "#6B7280", 0.15), color: STATUS_COLORS[selectedMeeting.status] ?? "#6B7280" }}>
                    {selectedMeeting.status}
                  </span>
                </DetailItem>
              </div>
              {selectedMeeting.notes && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Notes</p>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>{selectedMeeting.notes}</p>
                </div>
              )}

              {/* Status actions */}
              {selectedMeeting.status === "scheduled" && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => updateStatusMutation.mutate({ id: selectedMeeting.id, status: "completed" })}
                    disabled={updateStatusMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "#10B981" }}>
                    <Check className="w-3.5 h-3.5" /> Completed
                  </button>
                  <button onClick={() => updateStatusMutation.mutate({ id: selectedMeeting.id, status: "no_show" })}
                    disabled={updateStatusMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "#F59E0B" }}>
                    <AlertTriangle className="w-3.5 h-3.5" /> No show
                  </button>
                  <button onClick={() => updateStatusMutation.mutate({ id: selectedMeeting.id, status: "cancelled" })}
                    disabled={updateStatusMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "#EF4444" }}>
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["meetings"] })}
      />
    </div>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
      {children}
    </div>
  );
}
