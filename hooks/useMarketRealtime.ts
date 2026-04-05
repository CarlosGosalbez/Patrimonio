"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to market_cache Realtime changes.
 * Whenever a price is updated by the market-updater Edge Function,
 * invalidates the 'investments' TanStack Query cache so all investment
 * components refresh automatically.
 *
 * Mount in a layout component that wraps the investments module.
 */
export function useMarketRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("market_cache_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "market_cache",
        },
        () => {
          // Invalidate all investment-related queries so components re-fetch
          queryClient.invalidateQueries({ queryKey: ["investments"] });
          queryClient.invalidateQueries({ queryKey: ["market_cache"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
