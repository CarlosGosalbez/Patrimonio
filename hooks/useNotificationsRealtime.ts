"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";

interface NotificationInsertPayload {
  id: string;
  user_id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface UseNotificationsRealtimeReturn {
  unreadCount: number;
  resetCount: () => void;
}

/**
 * Subscribes to notifications Realtime INSERT events for the current user.
 * Returns the count of unread notifications received since mount,
 * and a reset function to clear the badge (call on notifications panel open).
 *
 * Mount in AppShell or the top-level authenticated layout.
 */
export function useNotificationsRealtime(initialCount = 0): UseNotificationsRealtimeReturn {
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(initialCount);

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as NotificationInsertPayload;
          // Only increment badge for new unread notifications
          if (!row.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const resetCount = () => setUnreadCount(0);

  return { unreadCount, resetCount };
}
