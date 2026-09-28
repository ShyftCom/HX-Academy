"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface StationOption {
  id: string;
  name: string;
  wilaya?: string | null;
}

/**
 * The one "move this record to another station" dialog, shared by leads and
 * players. Deliberately a separate PATCH-driven flow rather than a field
 * tucked into the big edit form: the caller's mutation hits a dedicated
 * `/station` route that touches only stationId, so this can't accidentally
 * null out unrelated fields the way posting a partial body to the general
 * PUT route would.
 */
export function TransferStationDialog({
  open,
  onOpenChange,
  currentStationId,
  subjectName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStationId?: string | null;
  subjectName?: string;
  onConfirm: (stationId: string) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation("common");
  const { data: stations = [] } = useQuery<StationOption[]>({
    queryKey: ["stations"],
    queryFn: () => fetch("/api/stations").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (open) setSelected(currentStationId ?? "");
  }, [open, currentStationId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t("ui.transfer_station")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {subjectName && (
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{subjectName}</p>
          )}
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder={t("ui.station")} /></SelectTrigger>
            <SelectContent>
              {stations.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}{s.wilaya ? ` — ${s.wilaya}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("ui.cancel")}</Button>
          <Button
            onClick={() => selected && onConfirm(selected)}
            loading={loading}
            disabled={!selected || selected === (currentStationId ?? "")}
          >
            {t("ui.transfer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
