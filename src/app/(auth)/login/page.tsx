"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(t("login.invalid_credentials"));
        return;
      }

      const res = await fetch("/api/auth/me");
      const me = await res.json();

      if (me.isPlayer) {
        router.push("/player");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      toast.error(t("login.invalid_credentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 text-white font-bold text-sm shadow-lg">
          FSA
        </div>
        <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
        <CardDescription>{t("login.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              {...register("email")}
              label={t("login.email_label")}
              type="email"
              placeholder={t("login.email_placeholder")}
              icon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              autoComplete="email"
            />
          </div>
          <div>
            <div className="relative">
              <Input
                {...register("password")}
                label={t("login.password_label")}
                type={showPassword ? "text" : "password"}
                placeholder={t("login.password_placeholder")}
                icon={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute end-3 top-[34px] text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {t("login.forgot_password")}
            </Link>
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            {t("login.sign_in")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
