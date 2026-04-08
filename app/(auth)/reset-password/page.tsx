import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export async function generateMetadata() {
  const t = await getTranslations("resetPassword");

  return {
    title: `${t("title")} — Patrimio`,
  };
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
