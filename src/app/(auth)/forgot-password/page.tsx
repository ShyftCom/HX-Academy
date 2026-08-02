"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/shared/auth-card";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const schema = z.object({
  email: z.string().email("invalid_email"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        // The API's raw message is not surfaced: it can distinguish a known
        // from an unknown address, which is an account-enumeration oracle.
        toast.error(t("forgot_password.not_found"));
      }
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const backLink = (
    <Link
      href="/login"
      className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ob-text-muted)] transition-colors hover:text-[var(--ob-text)]"
    >
      <ArrowLeft className="h-3.5 w-3.5 rtl:scale-x-[-1]" aria-hidden="true" />
      {t("forgot_password.back_to_login")}
    </Link>
  );

  if (sent) {
    return (
      <AuthCard title={t("forgot_password.success")} footer={backLink}>
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--ob-radius-container)] border border-[rgba(60,215,255,0.3)] bg-[var(--ob-success-soft)]"
            aria-hidden="true"
          >
            <CheckCircle2 className="h-5 w-5 text-[var(--ob-success)]" />
          </div>
          <p className="ob-mono break-all normal-case text-[var(--ob-text-secondary)]">
            {getValues("email")}
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("forgot_password.title")}
      description={t("forgot_password.subtitle")}
      footer={backLink}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          {...register("email")}
          label={t("forgot_password.email_label")}
          type="email"
          placeholder={t("login.email_placeholder")}
          icon={<Mail className="h-4 w-4" />}
          error={errors.email ? t("errors.invalid_email") : undefined}
          autoComplete="email"
          autoFocus
          required
        />
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {t("forgot_password.send_link")}
        </Button>
      </form>
    </AuthCard>
  );
}
