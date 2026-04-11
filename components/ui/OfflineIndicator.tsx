"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useTranslations } from "next-intl";

export function OfflineIndicator() {
  const t = useTranslations("offline");
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };
    const handleOnline = () => {
      setIsOffline(false);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !wasOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isOffline ? t("title") : t("online")}
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all duration-300 ${isOffline
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        }`}
    >
      {isOffline ? (
        <WifiOff className="h-3 w-3 shrink-0" aria-hidden="true" />
      ) : (
        <Wifi className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      {isOffline ? t("description") : t("online")}
    </div>
  );
}
