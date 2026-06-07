"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";
import { Lock, Save } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const pwMutation = useMutation({
    mutationFn: () => fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }) }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; }),
    onSuccess: () => { toast.success("Password changed successfully"); setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to change password"),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="My Profile" description="Manage your account settings" />

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">{getInitials(session?.user?.name ?? "U")}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{session?.user?.name}</h2>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{(session?.user as any)?.roleName ?? "Staff"}</p>
            </div>
          </div>
          <Separator />
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-base font-semibold mb-4"><Lock className="h-4 w-4" />Change Password</h3>
            <div className="space-y-4">
              <Input label="Current Password" type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} placeholder="••••••••" />
              <Input label="New Password" type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder="Min 8 characters" />
              <Input label="Confirm New Password" type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} placeholder="Repeat new password" />
              <Button onClick={() => {
                if (!pwForm.currentPassword || !pwForm.newPassword) { toast.error("All fields required"); return; }
                if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error("Passwords don't match"); return; }
                if (pwForm.newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
                pwMutation.mutate();
              }} loading={pwMutation.isPending}><Save className="mr-2 h-4 w-4" />Change Password</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
