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
import { Button } from "@/components/ui/button";
import { MapPin, ChevronDown, Globe } from "lucide-react";

export function StationSwitcher() {
  const { activeStationId, setActiveStationId, isGlobalView } = useStation();

  const { data: stations = [] } = useQuery<any[]>({
    queryKey: ["stations"],
    queryFn: () => fetch("/api/stations").then((r) => r.json()),
  });

  const activeStation = stations.find((s: any) => s.id === activeStationId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 max-w-[200px] truncate">
          {isGlobalView ? (
            <>
              <Globe className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span className="truncate">All Stations</span>
            </>
          ) : (
            <>
              <MapPin className="h-3.5 w-3.5 shrink-0 text-green-600" />
              <span className="truncate">{activeStation?.name ?? "Select Station"}</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => setActiveStationId(null)} className="gap-2">
          <Globe className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-sm font-medium">All Stations</p>
            <p className="text-xs text-gray-400">Global view</p>
          </div>
        </DropdownMenuItem>
        {stations.length > 0 && <DropdownMenuSeparator />}
        {stations.map((s: any) => (
          <DropdownMenuItem key={s.id} onClick={() => setActiveStationId(s.id)} className="gap-2">
            <MapPin className="h-4 w-4 text-green-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-xs text-gray-400 truncate">{s.wilaya}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
