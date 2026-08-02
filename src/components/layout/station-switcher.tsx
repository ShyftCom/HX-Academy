"use client";

import { useQuery } from "@tanstack/react-query";
import { useStation } from "@/context/StationContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Globe, MapPin } from "lucide-react";

interface Station {
  id: string;
  name: string;
  wilaya?: string | null;
}

/**
 * Workspace scope selector.
 *
 * Was a plain outline button floating in an otherwise empty top bar; it now
 * reads as the workspace context it actually is — a labelled, bordered control
 * anchored to the start of the bar, with the current scope always visible.
 */
export function StationSwitcher() {
  const { t } = useTranslation("common");
  const { activeStationId, setActiveStationId, isGlobalView } = useStation();

  const { data: stations = [], isLoading } = useQuery<Station[]>({
    queryKey: ["stations"],
    queryFn: () => fetch("/api/stations").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const active = stations.find((s) => s.id === activeStationId);
  const label = isGlobalView ? t("misc.all_stations") : (active?.name ?? t("misc.select_station"));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isLoading}
          aria-label={t("misc.select_station")}
          className={cn(
            "flex h-9 max-w-[260px] items-center gap-2.5 rounded-[var(--ob-radius-control)]",
            "border border-[var(--ob-line-strong)] bg-[var(--ob-surface)] ps-2.5 pe-2 text-sm",
            "text-[var(--ob-text)] transition-colors hover:bg-[var(--ob-surface-high)]",
            "disabled:opacity-50"
          )}
        >
          {isGlobalView ? (
            <Globe className="h-4 w-4 shrink-0 text-[var(--ob-primary-light)]" aria-hidden="true" />
          ) : (
            <MapPin className="h-4 w-4 shrink-0 text-[var(--ob-accent)]" aria-hidden="true" />
          )}
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span className="ob-mono text-[10px] uppercase text-[var(--ob-text-muted)]">
              {t("misc.station")}
            </span>
            <span className="max-w-[170px] truncate text-[13px] font-medium">{label}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--ob-text-muted)]" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem onClick={() => setActiveStationId(null)} className="gap-2.5">
          <Globe className="h-4 w-4 shrink-0 text-[var(--ob-primary-light)]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t("misc.all_stations")}</p>
            <p className="text-xs text-[var(--ob-text-muted)]">{t("misc.global_view")}</p>
          </div>
          {isGlobalView && <Check className="h-4 w-4 shrink-0 text-[var(--ob-primary-light)]" aria-hidden="true" />}
        </DropdownMenuItem>

        {stations.length > 0 && <DropdownMenuSeparator />}

        {stations.map((s) => {
          const selected = s.id === activeStationId;
          return (
            <DropdownMenuItem key={s.id} onClick={() => setActiveStationId(s.id)} className="gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-[var(--ob-accent)]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                {s.wilaya && <p className="truncate text-xs text-[var(--ob-text-muted)]">{s.wilaya}</p>}
              </div>
              {selected && <Check className="h-4 w-4 shrink-0 text-[var(--ob-primary-light)]" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
