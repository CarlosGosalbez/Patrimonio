"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordStrength } from "./PasswordStrength";

type RegisterValues = { email: string; password: string; confirmPassword: string };

export function RegisterForm() {
  const t = useTranslations("register");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const RegisterSchema = useMemo(
    () =>
      z
        .object({
          email: z.string().email({ message: tAuth("emailInvalid") }),
          password: z
            .string()
            .min(12, t("passwordMin"))
            .regex(/[A-Z]/, t("passwordUppercase"))
            .regex(/[a-z]/, t("passwordLowercase"))
            .regex(/[0-9]/, t("passwordNumber"))
            .regex(/[^A-Za-z0-9]/, t("passwordSymbol")),
          confirmPassword: z.string(),
        })
        .strict()
        .refine((data) => data.password === data.confirmPassword, {
          message: t("passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [t, tAuth],
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(RegisterSchema) });

  const passwordValue = watch("password", "");

  const onSubmit = async (values: RegisterValues) => {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      if (
        error.message.includes("already registered") ||
        error.message.includes("already in use")
      ) {
        setServerError(t("accountExists"));
      } else {
        setServerError(t("genericError"));
      }
      return;
    }

    setEmailSent(true);
    toast.success(t("accountCreated"));
  };

  if (emailSent) {
    return (
      <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
        <CardHeader className="space-y-1 pb-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <CardTitle className="text-xl font-semibold">{t("successTitle")}</CardTitle>
          <CardDescription>{t("successDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4 text-sm text-muted-foreground">{t("spamNotice")}</p>
          <a
            href="/login"
            className="rounded text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("goToLogin")}
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-semibold">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reg-email">{tAuth("emailLabel")}</Label>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              placeholder={tAuth("emailPlaceholder")}
              className="h-11"
              aria-describedby={errors.email ? "reg-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="reg-email-error" role="alert" className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-password">{t("passwordLabel")}</Label>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="h-11 pr-11"
                aria-describedby={errors.password ? "reg-password-error" : undefined}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground [-webkit-tap-highlight-color:transparent] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={
                  showPassword ? tAuth("toggleHidePassword") : tAuth("toggleShowPassword")
                }
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrength password={passwordValue} />
            {errors.password && (
              <p id="reg-password-error" role="alert" className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="h-11"
              aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p id="confirm-error" role="alert" className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="h-11 w-full font-medium" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {t("terms")}{" "}
            <a
              href="/terms"
              className="rounded text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("termsLink")}
            </a>{" "}
            {t("and")}{" "}
            <a
              href="/privacy"
              className="rounded text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("privacyLink")}
            </a>
            .
          </p>
        </form>

        <div className="mt-5 text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <a
            href="/login"
            className="rounded font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("signIn")}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
