import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-blue-600",
  iconBg = "bg-blue-50 dark:bg-blue-900/20",
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
            {subtitle && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
            )}
            {trend && (
              <div className={cn("mt-2 flex items-center gap-1 text-xs font-medium", trend.value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                <span>{trend.value >= 0 ? "+" : ""}{trend.value}%</span>
                <span className="text-gray-400 font-normal">{trend.label}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconBg)}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
