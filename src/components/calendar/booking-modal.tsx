"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ChevronLeft, ChevronRight, Loader2, User, Clock, Calendar, Check } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, startOfDay } from "date-fns";

interface Agent {
  id: string;
  name: string | null;
  image: string | null;
  agentAvailability: { timezone: string; bufferMinutes: number } | null;
}

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fill lead when opened from lead detail / status change */
  prefilledLeadId?: string;
  prefilledLeadName?: string;
  onSuccess?: (meetingId: string) => void;
}

const DURATIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
  { label: "Custom", value: 0 },
];

const MEETING_TYPES = [
  { label: "Discovery call", value: "call" },
  { label: "Follow-up", value: "follow_up" },
  { label: "Demo", value: "demo" },
  { label: "Closing", value: "closing" },
];

function AgentAvatar({ name, image, size = 8 }: { name: string | null; image: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  if (image) {
    return <img src={image} alt={name ?? ""} className={`w-${size} h-${size} rounded-full object-cover`} />;
  }
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
      style={{ background: "#8B5CF6" }}>
      {initials}
    </div>
  );
}

export function BookingModal({ open, onClose, prefilledLeadId, prefilledLeadName, onSuccess }: BookingModalProps) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"agent_first" | "time_first">("agent_first");

  // Form state
  const [leadSearch, setLeadSearch] = useState(prefilledLeadName ?? "");
  const [leadId, setLeadId] = useState(prefilledLeadId ?? "");
  const [leadName, setLeadName] = useState(prefilledLeadName ?? "");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(addDays(new Date(), 1)));
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState(45);
  const [showCustom, setShowCustom] = useState(false);
  const [meetingType, setMeetingType] = useState("call");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [dateOffset, setDateOffset] = useState(0);

  // Reset on open
  useEffect(() => {
    if (open) {
      setLeadSearch(prefilledLeadName ?? "");
      setLeadId(prefilledLeadId ?? "");
      setLeadName(prefilledLeadName ?? "");
      setSelectedAgent(null);
      setSelectedDate(startOfDay(addDays(new Date(), 1)));
      setSelectedTime("");
      setDuration(30);
      setShowCustom(false);
      setMeetingNotes("");
      setDateOffset(0);
      setMode("agent_first");
    }
  }, [open, prefilledLeadId, prefilledLeadName]);

  const effectiveDuration = showCustom ? customDuration : duration;
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["agents-for-booking"],
    queryFn: () => fetch("/api/users?roles=admin,agent&perPage=50").then((r) => r.json()).then((d) => d.data ?? d),
    enabled: open,
  });

  const { data: leadResults, isFetching: searchingLeads } = useQuery<{ id: string; fullName: string }[]>({
    queryKey: ["lead-search-booking", leadSearch],
    queryFn: () => fetch(`/api/leads?search=${encodeURIComponent(leadSearch)}&perPage=8`).then((r) => r.json()).then((d) => d.data ?? []),
    enabled: open && leadSearch.length > 1 && !leadId,
  });

  const { data: slotsData, isFetching: loadingSlots } = useQuery<{ slots: string[] }>({
    queryKey: ["slots", selectedAgent?.id, dateStr, effectiveDuration],
    queryFn: () => fetch(`/api/calendar/slots?agent_id=${selectedAgent!.id}&date=${dateStr}&duration=${effectiveDuration}`).then((r) => r.json()),
    enabled: open && !!selectedAgent && !!dateStr && mode === "agent_first",
  });

  const { data: availableAgents, isFetching: loadingAgents } = useQuery<{ agent_id: string; name: string; avatar: string | null }[]>({
    queryKey: ["available-agents", dateStr, selectedTime, effectiveDuration],
    queryFn: () => fetch(`/api/calendar/available-agents?date=${dateStr}&time=${selectedTime}&duration=${effectiveDuration}`).then((r) => r.json()),
    enabled: open && !!dateStr && !!selectedTime && mode === "time_first",
  });

  const bookMutation = useMutation({
    mutationFn: (data: object) => fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error ?? "Booking failed");
      }
      return r.json();
    }),
    onSuccess: (meeting) => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      toast.success(`Meeting booked with ${selectedAgent?.name ?? "agent"} on ${dateStr} at ${selectedTime}`);
      onSuccess?.(meeting.id);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canBook = leadId && selectedAgent && selectedDate && selectedTime && effectiveDuration > 0;

  const handleBook = () => {
    if (!canBook) return;
    bookMutation.mutate({
      leadId,
      agentId: selectedAgent!.id,
      date: dateStr,
      time: selectedTime,
      durationMinutes: effectiveDuration,
      type: meetingType,
      notes: meetingNotes || undefined,
    });
  };

  const visibleDates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), dateOffset * 7 + i + 1));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--card-border)" }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Book a Meeting</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Schedule a call with a lead</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10" style={{ color: "var(--text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-3 space-y-5">

            {/* Lead selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Lead</label>
              {leadId ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--muted-bg)", border: "1px solid var(--card-border)" }}>
                  <User className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{leadName}</span>
                  {!prefilledLeadId && (
                    <button onClick={() => { setLeadId(""); setLeadName(""); setLeadSearch(""); }} className="text-xs" style={{ color: "var(--text-muted)" }}>Change</button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search lead by name..."
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                  />
                  {leadSearch.length > 1 && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-20 overflow-hidden"
                      style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                      {searchingLeads ? (
                        <div className="p-3 flex justify-center"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} /></div>
                      ) : (leadResults ?? []).length === 0 ? (
                        <div className="p-3 text-sm" style={{ color: "var(--text-muted)" }}>No leads found</div>
                      ) : (
                        leadResults?.map((l) => (
                          <button key={l.id} onClick={() => { setLeadId(l.id); setLeadName(l.fullName); setLeadSearch(l.fullName); }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            style={{ color: "var(--text-primary)" }}>
                            {l.fullName}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mode tabs */}
            <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--muted-bg)" }}>
              {(["agent_first", "time_first"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setSelectedTime(""); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={mode === m
                    ? { background: "var(--card)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                    : { color: "var(--text-muted)" }}>
                  {m === "agent_first" ? "Pick agent first" : "Pick time first"}
                </button>
              ))}
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Duration</label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => {
                  const isCustom = d.value === 0;
                  const isActive = isCustom ? showCustom : (duration === d.value && !showCustom);
                  return (
                    <button key={d.value}
                      onClick={() => { if (isCustom) { setShowCustom(true); setDuration(0); } else { setShowCustom(false); setDuration(d.value); } }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                      style={{
                        background: isActive ? "#A02020" : "transparent",
                        color: isActive ? "#fff" : "var(--text-secondary)",
                        borderColor: isActive ? "#A02020" : "var(--card-border)",
                      }}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {showCustom && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="number" min={5} max={180} value={customDuration}
                    onChange={(e) => setCustomDuration(parseInt(e.target.value) || 5)}
                    className="w-24 px-3 py-1.5 rounded-lg text-sm outline-none text-center"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>minutes (5–180)</span>
                </div>
              )}
            </div>

            {/* ── AGENT FIRST MODE ── */}
            {mode === "agent_first" && (
              <>
                {/* Agent selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Agent</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(agents ?? []).map((a) => {
                      const isActive = selectedAgent?.id === a.id;
                      return (
                        <button key={a.id} onClick={() => { setSelectedAgent(a); setSelectedTime(""); }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-left border transition-all"
                          style={{
                            borderColor: isActive ? "#A02020" : "var(--card-border)",
                            background: isActive ? "rgba(160,32,32,0.06)" : "transparent",
                          }}>
                          <AgentAvatar name={a.name} image={a.image} size={7} />
                          <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{a.name}</span>
                          {isActive && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: "#A02020" }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date picker (7-day strip) */}
                {selectedAgent && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Date</label>
                      <div className="flex gap-1">
                        <button onClick={() => setDateOffset((o) => Math.max(0, o - 1))} disabled={dateOffset === 0}
                          className="p-1 rounded-lg disabled:opacity-30" style={{ color: "var(--text-muted)" }}>
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDateOffset((o) => o + 1)}
                          className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {visibleDates.map((d) => {
                        const isActive = format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                        return (
                          <button key={d.toISOString()}
                            onClick={() => { setSelectedDate(d); setSelectedTime(""); }}
                            className="flex flex-col items-center py-2 rounded-xl text-xs font-medium transition-all border"
                            style={{
                              borderColor: isActive ? "#A02020" : "var(--card-border)",
                              background: isActive ? "#A02020" : "transparent",
                              color: isActive ? "#fff" : "var(--text-secondary)",
                            }}>
                            <span className="text-[10px] uppercase">{format(d, "EEE")}</span>
                            <span className="text-sm font-bold mt-0.5">{format(d, "d")}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Time slots */}
                {selectedAgent && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Available slots</label>
                    {loadingSlots ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} /></div>
                    ) : (slotsData?.slots ?? []).length === 0 ? (
                      <div className="py-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>No available slots on this date</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {slotsData!.slots.map((slot) => {
                          const isActive = slot === selectedTime;
                          return (
                            <button key={slot} onClick={() => setSelectedTime(slot)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                              style={{
                                background: isActive ? "#A02020" : "transparent",
                                color: isActive ? "#fff" : "var(--text-secondary)",
                                borderColor: isActive ? "#A02020" : "var(--card-border)",
                              }}>
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── TIME FIRST MODE ── */}
            {mode === "time_first" && (
              <>
                {/* Date strip */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Date</label>
                    <div className="flex gap-1">
                      <button onClick={() => setDateOffset((o) => Math.max(0, o - 1))} disabled={dateOffset === 0}
                        className="p-1 rounded-lg disabled:opacity-30" style={{ color: "var(--text-muted)" }}>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDateOffset((o) => o + 1)}
                        className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {visibleDates.map((d) => {
                      const isActive = format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                      return (
                        <button key={d.toISOString()}
                          onClick={() => { setSelectedDate(d); setSelectedTime(""); setSelectedAgent(null); }}
                          className="flex flex-col items-center py-2 rounded-xl text-xs font-medium transition-all border"
                          style={{
                            borderColor: isActive ? "#A02020" : "var(--card-border)",
                            background: isActive ? "#A02020" : "transparent",
                            color: isActive ? "#fff" : "var(--text-secondary)",
                          }}>
                          <span className="text-[10px] uppercase">{format(d, "EEE")}</span>
                          <span className="text-sm font-bold mt-0.5">{format(d, "d")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Manual time input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Time</label>
                  <input type="time" value={selectedTime} onChange={(e) => { setSelectedTime(e.target.value); setSelectedAgent(null); }}
                    className="px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
                </div>

                {/* Available agents */}
                {selectedTime && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Available agents</label>
                    {loadingAgents ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} /></div>
                    ) : (availableAgents ?? []).length === 0 ? (
                      <div className="py-4 text-sm text-center" style={{ color: "var(--text-muted)" }}>No agents available at this time</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {availableAgents!.map((a) => {
                          const isActive = selectedAgent?.id === a.agent_id;
                          return (
                            <button key={a.agent_id}
                              onClick={() => setSelectedAgent({ id: a.agent_id, name: a.name, image: a.avatar, agentAvailability: null })}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-left border transition-all"
                              style={{
                                borderColor: isActive ? "#A02020" : "var(--card-border)",
                                background: isActive ? "rgba(160,32,32,0.06)" : "transparent",
                              }}>
                              <AgentAvatar name={a.name} image={a.avatar} size={7} />
                              <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{a.name}</span>
                              <span className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#10B981" }} />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Meeting type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Type</label>
              <div className="flex flex-wrap gap-2">
                {MEETING_TYPES.map((t) => {
                  const isActive = meetingType === t.value;
                  return (
                    <button key={t.value} onClick={() => setMeetingType(t.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={{
                        background: isActive ? "#3B82F6" : "transparent",
                        color: isActive ? "#fff" : "var(--text-secondary)",
                        borderColor: isActive ? "#3B82F6" : "var(--card-border)",
                      }}>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Pre-meeting notes (optional)</label>
              <textarea rows={2} value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder="Any context for this meeting..."
                className="w-full resize-none px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
            </div>
          </div>

          {/* RIGHT COLUMN — Summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-0 rounded-2xl p-5 space-y-4" style={{ background: "var(--muted-bg)", border: "1px solid var(--card-border)" }}>
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Booking summary</h3>

              <div className="space-y-3">
                <SummaryRow icon={User} label="Lead" value={leadName || "—"} />
                <SummaryRow icon={User} label="Agent" value={selectedAgent?.name ?? "—"} />
                <SummaryRow icon={Calendar} label="Date" value={selectedDate ? format(selectedDate, "EEEE, MMM d yyyy") : "—"} />
                <SummaryRow icon={Clock} label="Time" value={selectedTime || "—"} />
                <SummaryRow icon={Clock} label="Duration" value={effectiveDuration ? `${effectiveDuration} min` : "—"} />
                <SummaryRow icon={Calendar} label="Type" value={MEETING_TYPES.find((t) => t.value === meetingType)?.label ?? "—"} />
              </div>

              <button
                onClick={handleBook}
                disabled={!canBook || bookMutation.isPending}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: canBook ? "#A02020" : "#6B7280" }}>
                {bookMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Meeting
              </button>

              {!canBook && (
                <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                  {!leadId ? "Select a lead" : !selectedAgent ? "Select an agent" : !selectedTime ? "Pick a time slot" : "Fill all fields"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{value}</p>
      </div>
    </div>
  );
}
