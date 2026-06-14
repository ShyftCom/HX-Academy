"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";

type PixelConfig = {
  id: string | null;
  platform: string;
  pixelId: string;
  accessToken: string;
  useConversionApi: boolean;
  testEventCode: string;
  isActive: boolean;
};

const PLATFORMS = [
  { key: "facebook", label: "Facebook", prefix: "fb://" },
  { key: "tiktok", label: "TikTok", prefix: "tt://" },
  { key: "google", label: "Google Analytics", prefix: "ga://" },
  { key: "snapchat", label: "Snapchat", prefix: "sc://" },
];

function PlatformCard({ config, stationId }: { config: PixelConfig; stationId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<PixelConfig>({ ...config });
  const platform = PLATFORMS.find((p) => p.key === config.platform);

  useEffect(() => {
    setForm({ ...config });
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/pixels/${stationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: form.platform,
          pixelId: form.pixelId,
          accessToken: form.accessToken,
          useConversionApi: form.useConversionApi,
          testEventCode: form.testEventCode,
          isActive: form.isActive,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success(`${platform?.label} config saved`);
      qc.invalidateQueries({ queryKey: ["pixel-configs", stationId] });
    },
    onError: () => toast.error("Save failed"),
  });

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">{platform?.label ?? config.platform}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Active</span>
          <Switch
            checked={form.isActive}
            onCheckedChange={(v) => setForm((prev) => ({ ...prev, isActive: v }))}
          />
        </div>
      </div>

      <Input
        label="Pixel ID / Measurement ID"
        value={form.pixelId}
        onChange={(e) => setForm((prev) => ({ ...prev, pixelId: e.target.value }))}
        placeholder={`Enter ${platform?.label ?? config.platform} Pixel ID`}
      />

      {form.isActive && (
        <>
          <Separator />

          <Input
            label="Access Token"
            type="password"
            value={form.accessToken}
            onChange={(e) => setForm((prev) => ({ ...prev, accessToken: e.target.value }))}
            placeholder="Access token / API secret"
          />

          <div className="flex items-center gap-3">
            <Switch
              checked={form.useConversionApi}
              onCheckedChange={(v) => setForm((prev) => ({ ...prev, useConversionApi: v }))}
            />
            <span className="text-sm">Enable Conversion API (server-side events)</span>
          </div>

          {form.useConversionApi && (
            <Input
              label="Test Event Code"
              value={form.testEventCode}
              onChange={(e) => setForm((prev) => ({ ...prev, testEventCode: e.target.value }))}
              placeholder="TEST12345 (optional)"
            />
          )}
        </>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
          Save
        </Button>
      </div>
    </Card>
  );
}

export default function PixelsSettingsPage() {
  const { data: session } = useSession();
  const stationId = (session?.user as any)?.stationId ?? "";

  const { data: configs = [], isLoading } = useQuery<PixelConfig[]>({
    queryKey: ["pixel-configs", stationId],
    queryFn: () => fetch(`/api/pixels/${stationId}`).then((r) => r.json()),
    enabled: !!stationId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pixel & Tracking"
        description="Configure ad pixels and server-side conversion APIs for all platforms"
      />

      {isLoading && <p className="text-sm text-gray-400">Loading configurations...</p>}

      {!stationId && !isLoading && (
        <p className="text-sm text-gray-400">No station associated with your account.</p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {configs.map((config) => (
          <PlatformCard key={config.platform} config={config} stationId={stationId} />
        ))}
      </div>
    </div>
  );
}
