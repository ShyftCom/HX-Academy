"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
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
      const json = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        toast.error(json.error ?? t("forgot_password.not_found"));
      }
    } catch {
      toast.error(t("forgot_password.not_found"));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md shadow-2xl text-center">
        <CardContent className="p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("forgot_password.success")}</h2>
          <p className="mt-2 text-sm text-gray-500">
            <strong>{getValues("email")}</strong>
          </p>
          <Link href="/login">
            <Button variant="outline" className="mt-6">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t("forgot_password.back_to_login")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("forgot_password.title")}</CardTitle>
        <CardDescription>{t("forgot_password.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register("email")}
            label={t("forgot_password.email_label")}
            type="email"
            placeholder="you@example.com"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
          />
          <Button type="submit" className="w-full" loading={loading}>
            {t("forgot_password.send_link")}
          </Button>
          <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("forgot_password.back_to_login")}
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
