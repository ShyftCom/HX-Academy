"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/shared/auth-card";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const schema = z.object({
  email: z.string().email("invalid_email"),
  password: z.string().min(1, "required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setFormError(null);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Deliberately generic: distinguishing "no such account" from "wrong
        // password" tells an attacker which emails are registered.
        setFormError(t("login.invalid_credentials"));
        toast.error(t("login.invalid_credentials"));
        return;
      }

      const res = await fetch("/api/auth/me");
      const me = await res.json();
      router.push(me.isPlayer ? "/player" : "/dashboard");
      router.refresh();
    } catch {
      setFormError(t("login.invalid_credentials"));
      toast.error(t("login.invalid_credentials"));
    } finally {
      setLoading(false);
    }
  };

  // Zod carries a key, not a sentence, so the message translates with the UI.
  const msg = (code?: string) =>
    code ? t(code === "invalid_email" ? "errors.invalid_email" : "requiredField") : undefined;

  return (
    <AuthCard
      title={t("login.title")}
      description={t("login.subtitle")}
      footer={
        <Link
          href="/forgot-password"
          className="text-[13px] text-[var(--ob-primary-light)] transition-colors hover:text-[var(--ob-primary)] hover:underline"
        >
          {t("login.forgot_password")}
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {/* Server-side failure summary, announced to assistive tech. */}
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[var(--ob-radius-control)] border border-[rgba(255,180,171,0.3)] bg-[var(--ob-error-soft)] px-3 py-2.5 text-[13px] text-[var(--ob-error)]"
          >
            {formError}
          </div>
        )}

        <Input
          {...register("email")}
          label={t("login.email_label")}
          type="email"
          placeholder={t("login.email_placeholder")}
          icon={<Mail className="h-4 w-4" />}
          error={msg(errors.email?.message)}
          autoComplete="email"
          autoFocus
          required
        />

        <div className="relative">
          <Input
            {...register("password")}
            label={t("login.password_label")}
            type={showPassword ? "text" : "password"}
            placeholder={t("login.password_placeholder")}
            icon={<Lock className="h-4 w-4" />}
            error={msg(errors.password?.message)}
            autoComplete="current-password"
            required
            className="pe-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t("login.hide_password") : t("login.show_password")}
            aria-pressed={showPassword}
            // top-[30px] clears the label above the field.
            className="absolute end-2.5 top-[30px] rounded-[2px] p-1 text-[var(--ob-text-muted)] transition-colors hover:text-[var(--ob-text)]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Button type="submit" className="mt-1 w-full" size="lg" loading={loading}>
          {loading ? t("login.signing_in") : t("login.sign_in")}
        </Button>
      </form>
    </AuthCard>
  );
}
