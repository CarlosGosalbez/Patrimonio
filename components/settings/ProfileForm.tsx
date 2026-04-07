"use client";

import { useState, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { UpdateProfileSchema, type UpdateProfileInput } from "@/lib/profile/types";
import { useProfileQuery, useUpdateProfileMutation } from "@/hooks/useProfile";
import { uploadAvatar } from "@/lib/profile/upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * FASE 2 Profile Management — ProfileForm component
 * 
 * TODO for complete implementation:
 * - Add AvatarUpload component with react-easy-crop
 * - Add SessionsTable component with active sessions list
 * - Add email change flow with password confirmation
 * - Add WCAG 2.2 AA aria-labels and role="alert" for errors
 */
export function ProfileForm() {
    const t = useTranslations("profile");
    const tCommon = useTranslations("common");
    const profileQuery = useProfileQuery();
    const updateProfile = useUpdateProfileMutation();
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const fullNameId = useId();
    const dateOfBirthId = useId();

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isDirty, isSubmitting },
    } = useForm<UpdateProfileInput>({
        resolver: zodResolver(UpdateProfileSchema),
        values: profileQuery.data
            ? {
                full_name: profileQuery.data.full_name,
                date_of_birth: profileQuery.data.date_of_birth,
                avatar_url: profileQuery.data.avatar_url,
            }
            : undefined,
    });

    const avatarUrl = watch("avatar_url");

    async function onSubmit(data: UpdateProfileInput) {
        try {
            await updateProfile.mutateAsync(data);
            toast.success(t("saved"));
        } catch (error) {
            toast.error(t("errorSaving"));
        }
    }

    async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file || !profileQuery.data) return;

        setIsUploadingAvatar(true);
        try {
            const userId = (await fetch("/api/profile").then((r) => r.json())).user_id; // Stub: get from auth context
            const result = await uploadAvatar({ file, userId });
            setValue("avatar_url", result.public_url);
            toast.success(t("avatarUploaded"));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("avatarUploadFailed"));
        } finally {
            setIsUploadingAvatar(false);
        }
    }

    if (profileQuery.isLoading) {
        return <div className="flex items-center justify-center p-8">{tCommon("loading")}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Avatar section */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("picture.title")}</CardTitle>
                    <CardDescription>{t("picture.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {avatarUrl && (
                        <div className="flex items-center gap-4">
                            <img
                                src={avatarUrl}
                                alt={t("picture.alt")}
                                className="h-20 w-20 rounded-full object-cover"
                            />
                        </div>
                    )}
                    <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarUpload}
                        disabled={isUploadingAvatar}
                        aria-label={t("picture.uploadLabel")}
                    />
                    <p className="text-sm text-muted-foreground">{t("picture.hint")}</p>
                </CardContent>
            </Card>

            {/* Personal info */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("personal.title")}</CardTitle>
                    <CardDescription>{t("personal.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div>
                            <Label htmlFor={fullNameId}>{t("fullName")}</Label>
                            <Input
                                id={fullNameId}
                                type="text"
                                {...register("full_name")}
                                className="mt-2 min-h-[44px]"
                                aria-invalid={!!errors.full_name}
                            />
                            {errors.full_name && (
                                <p role="alert" className="mt-1 text-sm text-destructive">
                                    {errors.full_name.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor={dateOfBirthId}>{t("dateOfBirth")}</Label>
                            <Input
                                id={dateOfBirthId}
                                type="date"
                                {...register("date_of_birth")}
                                className="mt-2 min-h-[44px]"
                                aria-invalid={!!errors.date_of_birth}
                            />
                            {errors.date_of_birth && (
                                <p role="alert" className="mt-1 text-sm text-destructive">
                                    {errors.date_of_birth.message}
                                </p>
                            )}
                        </div>

                        <Button type="submit" disabled={!isDirty || isSubmitting}>
                            {isSubmitting ? tCommon("saving") : tCommon("save")}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* TODO: Add SessionsTable component here */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("sessions.title")}</CardTitle>
                    <CardDescription>{t("sessions.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Placeholder: implement SessionsTable with active sessions list + revoke buttons */}
                    <p className="text-sm text-muted-foreground">{t("sessions.placeholder")}</p>
                </CardContent>
            </Card>
        </div>
    );
}
