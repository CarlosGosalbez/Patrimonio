"use client";

import { useEffect, useState } from "react";
import {
  queueMutation,
  getPendingMutations,
  syncPendingMutations,
  type PendingMutation,
} from "@/lib/pwa/offlineQueue";

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    updatePendingCount();
  }, []);

  const updatePendingCount = async () => {
    try {
      const mutations = await getPendingMutations();
      setPendingCount(mutations.length);
    } catch {
      setPendingCount(0);
    }
  };

  const addToQueue = async (mutation: Omit<PendingMutation, "id" | "timestamp" | "retries">) => {
    await queueMutation(mutation);
    await updatePendingCount();
  };

  const sync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncPendingMutations();
      await updatePendingCount();
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    pendingCount,
    isSyncing,
    addToQueue,
    sync,
  };
}
