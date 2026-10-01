"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { formatDate, getInitials } from "@/lib/utils";
import { Upload, Save, Lock } from "lucide-react";
import { FullPageLoader } from "@/components/shared/loading-spinner";
import { uploadFile } from "@/lib/upload-client";
import { useTranslation } from "react-i18next";

export default function PlayerProfilePage() {
  const { t } = useTranslation("common");
  const { data: session } = useSession();
  const playerId = (session?.user as any)?.playerId;
  const qc = useQueryClient();
  const [form, setForm] = useState({ phone: "", address: "", parentPhone: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [photo, setPhoto] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: player, isLoading } = useQuery({
    queryKey: ["player-profile", playerId],
    queryFn: () => fetch(`/api/players/${playerId}`).then((r) => r.json()),
    enabled: !!playerId,
  });

  useEffect(() => {
    if (player) {
      setForm({ phone: player.phone ?? "", address: player.address ?? "", parentPhone: player.parentPhone ?? "" });
      setPhoto(player.photo ?? "");
    }
  }, [player]);

  const updateMutation = useMutation({
    mutationFn: () => fetch(`/api/players/${playerId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...player, phone: form.phone, address: form.address, parentPhone: form.parentPhone, photo }) }).then(async (r) => { if (!r.ok) throw new Error(t("portal.profile.toast_update_failed")); return r.json(); }),
    onSuccess: () => { toast.success(t("portal.profile.toast_updated")); qc.invalidateQueries({ queryKey: ["player-profile"] }); },
    onError: () => toast.error(t("portal.profile.toast_update_failed")),
  });

  const pwMutation = useMutation({
    mutationFn: () => fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }) }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; }),
    onSuccess: () => { toast.success(t("portal.profile.toast_password_changed")); setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); },
    onError: (e: any) => toast.error(e.message || t("portal.common.failed")),
  });

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const blob = await uploadFile(file, { folder: "players", maxSizeMb: 25 });
      setPhoto(blob.url);
      toast.success(t("portal.profile.toast_photo_uploaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("portal.common.upload_failed"));
    } finally {
      setUploading(false);
    }
  };

  if (isLoading || !playerId) return <FullPageLoader />;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("portal.profile.title")}</h1>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={photo} />
                <AvatarFallback className="text-xl">{getInitials(player?.fullName ?? "P")}</AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors">
                <input type="file" className="hidden" accept="image/*" onChange={uploadPhoto} />
                {uploading ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Upload className="h-3.5 w-3.5" />}
              </label>
            </div>
            <div>
              <h2 className="text-lg font-bold">{player?.fullName}</h2>
              <p className="text-sm text-gray-500">{player?.email}</p>
              <p className="text-xs text-gray-400">{player?.category ?? t("portal.common.player")} {player?.team ? `· ${player.team}` : ""}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            {[[t("portal.profile.date_of_birth"), formatDate(player?.dateOfBirth)], [t("portal.profile.gender"), player?.gender], [t("portal.profile.position"), player?.position], [t("portal.profile.category"), player?.category]].map(([k, v]) => v ? (
              <div key={k}><p className="text-xs text-gray-400">{k}</p><p className="font-medium">{v}</p></div>
            ) : null)}
          </div>

          <Separator className="my-4" />
          <p className="text-sm font-semibold mb-3">{t("portal.profile.update_info")}</p>
          <div className="space-y-3">
            <Input label={t("portal.profile.phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+213 ..." />
            <Input label={t("portal.profile.address")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t("portal.profile.address_placeholder")} />
            <Input label={t("portal.profile.parent_phone")} value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} placeholder="+213 ..." />
          </div>
          <Button className="mt-4 w-full" onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}><Save className="me-2 h-4 w-4" />{t("portal.profile.save")}</Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="h-4 w-4" />{t("portal.profile.change_password")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input label={t("portal.profile.current_password")} type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} placeholder="••••••••" />
          <Input label={t("portal.profile.new_password")} type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder={t("portal.profile.new_password_placeholder")} />
          <Input label={t("portal.profile.confirm_password")} type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} placeholder={t("portal.profile.confirm_password_placeholder")} />
          <Button className="w-full" onClick={() => {
            if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error(t("portal.profile.toast_passwords_mismatch")); return; }
            if (pwForm.newPassword.length < 8) { toast.error(t("portal.profile.toast_password_too_short")); return; }
            pwMutation.mutate();
          }} loading={pwMutation.isPending}>{t("portal.profile.change_password")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
