"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, BellOff } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationsSettings() {
  const t = useTranslations("pushNotifications");
  const deviceLabelId = useId();
  const [deviceLabel, setDeviceLabel] = useState("");
  const {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    isSubscribing,
    isUnsubscribing,
    subscribeError,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Alert role="status" aria-live="polite">
        <BellOff className="h-4 w-4" aria-hidden="true" />
        <AlertDescription>{t("notSupported")}</AlertDescription>
      </Alert>
    );
  }

  const errorMessage = subscribeError
    ? subscribeError.message === "permission_denied"
      ? t("permissionDenied")
      : t("subscribeError")
    : null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {!isSubscribed && (
        <div className="space-y-2">
          <Label htmlFor={deviceLabelId}>{t("deviceLabel")}</Label>
          <Input
            id={deviceLabelId}
            value={deviceLabel}
            onChange={(e) => setDeviceLabel(e.target.value)}
            placeholder={t("deviceLabelPlaceholder")}
            maxLength={100}
            className="min-h-[44px]"
          />
        </div>
      )}

      {errorMessage && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertDescription aria-describedby="push-error">{errorMessage}</AlertDescription>
        </Alert>
      )}

      {isSubscribed ? (
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">{t("active")}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => unsubscribe()}
            disabled={isUnsubscribing || isLoading}
            className="ml-auto min-h-[44px]"
          >
            <BellOff className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("disable")}
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => subscribe(deviceLabel || undefined)}
          disabled={isSubscribing || isLoading}
          className="min-h-[44px] w-full"
        >
          <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
          {t("enable")}
        </Button>
      )}
    </div>
  );
}
