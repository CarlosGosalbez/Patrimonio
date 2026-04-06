"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  isPushSupported,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentPushSubscription,
  serializePushSubscription,
} from "@/lib/pwa/notifications";

const QUERY_KEY = ["push-subscription"] as const;

export function usePushNotifications() {
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!isPushSupported()) return null;
      return getCurrentPushSubscription();
    },
    staleTime: 1000 * 60 * 5,
  });

  const isSubscribed = !!subscription;

  const subscribeMutation = useMutation({
    mutationFn: async (deviceLabel?: string) => {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        throw new Error(permission === "denied" ? "permission_denied" : "permission_default");
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) throw new Error("VAPID key not configured");

      const sub = await subscribeToPush(vapidPublicKey);
      if (!sub) throw new Error("subscription_failed");

      const payload = {
        ...serializePushSubscription(sub),
        user_agent: navigator.userAgent,
        device_label: deviceLabel ?? null,
      };

      const res = await fetch("/api/pwa/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("api_error");
      return sub;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const sub = await getCurrentPushSubscription();
      if (!sub) return;

      const { endpoint } = serializePushSubscription(sub);

      await fetch("/api/pwa/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });

      await unsubscribeFromPush();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    isSupported: isPushSupported(),
    isSubscribed,
    isLoading,
    subscription,
    subscribe: subscribeMutation.mutate,
    unsubscribe: unsubscribeMutation.mutate,
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
    subscribeError: subscribeMutation.error,
    unsubscribeError: unsubscribeMutation.error,
  };
}
