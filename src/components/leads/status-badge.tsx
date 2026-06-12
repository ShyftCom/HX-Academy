"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { toast } from "sonner";

export interface LeadStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  isTerminal: boolean;
}

interface StatusBadgeProps {
  leadId: string;
  leadName: string;
  currentStatus: LeadStatus | null | undefined;
  statuses: LeadStatus[];
  onStatusChange?: (newStatus: LeadStatus) => void;
  readOnly?: boolean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return null;
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
}

function badgeStyles(color: string): React.CSSProperties {
  const rgb = hexToRgb(color) ?? { r: 107, g: 114, b: 128 };
  return {
    background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`,
    color: color,
    border: `0.5px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`,
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 500,
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    transition: "opacity 0.1s",
  } as React.CSSProperties;
}

// Custom DOM event so only one dropdown is open at a time across all instances
const OPEN_EVENT = "lead-status-dropdown-open";

export function StatusBadge({
  leadId,
  leadName,
  currentStatus,
  statuses,
  onStatusChange,
  readOnly = false,
}: StatusBadgeProps) {
  const uid = useId();
  const badgeRef = useRef<HTMLSpanElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [dropLeft, setDropLeft] = useState<number>(0);
  const [dropTop, setDropTop] = useState<number>(0);
  const [optimisticStatus, setOptimisticStatus] = useState<LeadStatus | null | undefined>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setOptimisticStatus(currentStatus); }, [currentStatus]);

  // Listen for other badges opening — close this one
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ uid: string }>;
      if (ce.detail.uid !== uid) setOpen(false);
    };
    document.addEventListener(OPEN_EVENT, handler);
    return () => document.removeEventListener(OPEN_EVENT, handler);
  }, [uid]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        badgeRef.current && !badgeRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const toggleOpen = useCallback(() => {
    if (readOnly) return;
    if (open) { setOpen(false); return; }

    // Compute position
    const rect = badgeRef.current?.getBoundingClientRect();
    if (!rect) return;

    const spaceBelow = window.innerHeight - rect.bottom;
    const willDropUp = spaceBelow < 280;
    setDropUp(willDropUp);
    setDropLeft(rect.left + window.scrollX);
    setDropTop(willDropUp
      ? rect.top + window.scrollY - 8  // will subtract dropdown height via translateY
      : rect.bottom + window.scrollY + 6
    );
    setOpen(true);
    document.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { uid } }));
  }, [open, readOnly, uid]);

  const handleSelect = useCallback(async (newStatus: LeadStatus) => {
    setOpen(false);
    if (newStatus.id === optimisticStatus?.id) return;

    // Block moves away from terminal unless selecting same
    if (optimisticStatus?.isTerminal) return;

    const prevStatus = optimisticStatus;
    setOptimisticStatus(newStatus);
    setLoading(true);

    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_id: newStatus.id }),
      });

      if (!res.ok) throw new Error();

      toast.success(`${leadName} → ${newStatus.name}`, { duration: 2500 });
      onStatusChange?.(newStatus);
    } catch {
      setOptimisticStatus(prevStatus);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [leadId, leadName, optimisticStatus, onStatusChange]);

  const status = optimisticStatus;
  const color = status?.color ?? "#6B7280";
  const sorted = [...statuses].sort((a, b) => a.order - b.order);
  const isCurrentTerminal = status?.isTerminal ?? false;

  const dropdown = mounted && open ? createPortal(
    <div
      ref={dropdownRef}
      role="listbox"
      aria-label="Change lead status"
      style={{
        position: "absolute",
        top: dropUp ? undefined : dropTop,
        bottom: dropUp ? window.innerHeight - dropTop + 8 : undefined,
        left: dropLeft,
        zIndex: 200,
        minWidth: 200,
        maxHeight: 320,
        overflowY: "auto",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)",
        background: "var(--card)",
        border: "1px solid var(--card-border)",
      }}
    >
      <div style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
        Change status
      </div>
      {sorted.map((s) => {
        const isActive = s.id === status?.id;
        const isDisabled = isCurrentTerminal && !isActive;
        const rgb = hexToRgb(s.color) ?? { r: 107, g: 114, b: 128 };

        return (
          <div
            key={s.id}
            role="option"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            data-status-id={s.id}
            onClick={() => !isDisabled && handleSelect(s)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              cursor: isDisabled ? "not-allowed" : "pointer",
              opacity: isDisabled ? 0.4 : 1,
              background: isActive ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)` : "transparent",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!isDisabled && !isActive) (e.currentTarget as HTMLDivElement).style.background = "var(--muted-bg)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = isActive ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)` : "transparent";
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: isActive ? 600 : 400 }}>{s.name}</span>
            {s.isTerminal && (
              <span style={{ fontSize: 10, color: "var(--text-muted)", border: "0.5px solid var(--card-border)", borderRadius: 4, padding: "1px 4px" }}>final</span>
            )}
            {isActive && <Check style={{ width: 13, height: 13, color: s.color, flexShrink: 0 }} />}
          </div>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <span
        ref={badgeRef}
        onClick={toggleOpen}
        style={{
          ...badgeStyles(color),
          opacity: loading ? 0.7 : 1,
          position: "relative",
        }}
        title={readOnly ? undefined : "Click to change status"}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
        {status?.name ?? "No status"}
      </span>
      {dropdown}
    </>
  );
}
