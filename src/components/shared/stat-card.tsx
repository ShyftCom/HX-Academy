import { MetricCard } from "@/components/shared/metric-card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  /** @deprecated Ignored. Metric icons are uniformly neutral now — see below. */
  iconColor?: string;
  /** @deprecated Ignored. */
  iconBg?: string;
  trend?: { value: number; label: string };
  className?: string;
}

/**
 * Compatibility shim over {@link MetricCard}.
 *
 * ~20 pages import StatCard and pass per-instance `iconColor` / `iconBg`,
 * which is how the old dashboard ended up with six unrelated hues in a single
 * row. Those two props are accepted and ignored rather than removed, so every
 * existing call site keeps compiling while rendering the unified card.
 *
 * New code should import MetricCard directly.
 */
export function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <MetricCard
      title={title}
      value={value}
      subtitle={subtitle}
      icon={icon}
      trend={trend}
      className={className}
    />
  );
}
