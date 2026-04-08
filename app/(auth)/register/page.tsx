import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/auth/RegisterForm";

export async function generateMetadata() {
  const t = await getTranslations("register");

  return {
    title: `${t("title")} — Patrimio`,
  };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
