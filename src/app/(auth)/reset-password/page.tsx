"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/shared/auth-card";
import { Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const schema = z
  .object({
    password: z.string().min(8, "too_short"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "mismatch",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error(t("reset_password.expired"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      if (res.ok) {
        toast.success(t("reset_password.success"));
        router.push("/login");
      } else {
        toast.error(t("reset_password.expired"));
      }
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title={t("reset_password.title")} description={t("reset_password.subtitle_hint")}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="relative">
          <Input
            {...register("password")}
            label={t("reset_password.password_label")}
            type={show ? "text" : "password"}
            icon={<Lock className="h-4 w-4" />}
            error={errors.password ? t("reset_password.too_short") : undefined}
            hint={t("reset_password.too_short")}
            autoComplete="new-password"
            autoFocus
            required
            className="pe-10"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? t("login.hide_password") : t("login.show_password")}
            aria-pressed={show}
            className="absolute end-2.5 top-[30px] rounded-[2px] p-1 text-[var(--ob-text-muted)] transition-colors hover:text-[var(--ob-text)]"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Input
          {...register("confirmPassword")}
          label={t("reset_password.confirm_label")}
          // Deliberately always masked: the confirm field exists to catch a
          // typo in the first one, which revealing it would defeat.
          type="password"
          icon={<Lock className="h-4 w-4" />}
          error={errors.confirmPassword ? t("reset_password.mismatch") : undefined}
          autoComplete="new-password"
          required
        />

        <Button type="submit" className="mt-1 w-full" size="lg" loading={loading}>
          {t("reset_password.reset")}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    // useSearchParams needs a Suspense boundary to avoid opting the whole
    // route into client-side rendering during the static build.
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
