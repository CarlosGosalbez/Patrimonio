import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/settings/ProfileForm";

export async function generateMetadata() {
    const t = await getTranslations("profile");
    return {
        title: t("pageTitle"),
        description: t("pageDescription"),
    };
}

export default function ProfilePage() {
    return (
        <div className="container max-w-4xl py-8">
            <Suspense fallback={<div>Loading...</div>}>
                <ProfileForm />
            </Suspense>
        </div>
    );
}
