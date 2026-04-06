/**
 * Offline Write Queue — IndexedDB-based queue for mutations when network is unavailable.
 * Automatically syncs pending operations when connection is restored.
 */

const DB_NAME = "patrimio-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-mutations";

export interface PendingMutation {
  id: string;
  type: "create" | "update" | "delete";
  entity: "transaction" | "account" | "investment" | "commitment" | "budget";
  payload: Record<string, any>;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  timestamp: number;
  retries: number;
}

let db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("entity", "entity", { unique: false });
      }
    };
  });
}

export async function queueMutation(
  mutation: Omit<PendingMutation, "id" | "timestamp" | "retries">,
) {
  const database = await openDB();
  const tx = database.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const fullMutation: PendingMutation = {
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0,
  };

  return new Promise<void>((resolve, reject) => {
    const request = store.add(fullMutation);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const database = await openDB();
  const tx = database.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("timestamp");

  return new Promise((resolve, reject) => {
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeMutation(id: string): Promise<void> {
  const database = await openDB();
  const tx = database.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function incrementRetries(id: string): Promise<void> {
  const database = await openDB();
  const tx = database.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const mutation = getRequest.result;
      if (mutation) {
        mutation.retries += 1;
        const putRequest = store.put(mutation);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function syncPendingMutations(): Promise<{ success: number; failed: number }> {
  const mutations = await getPendingMutations();
  let success = 0;
  let failed = 0;

  for (const mutation of mutations) {
    try {
      const response = await fetch(mutation.endpoint, {
        method: mutation.method,
        headers: { "Content-Type": "application/json" },
        body: mutation.method !== "DELETE" ? JSON.stringify(mutation.payload) : undefined,
      });

      if (response.ok) {
        await removeMutation(mutation.id);
        success++;
      } else if (response.status >= 500 && mutation.retries < 3) {
        // Server error, retry later
        await incrementRetries(mutation.id);
        failed++;
      } else {
        // Client error or max retries reached, remove
        await removeMutation(mutation.id);
        failed++;
      }
    } catch (error) {
      // Network error, keep in queue
      if (mutation.retries < 3) {
        await incrementRetries(mutation.id);
      } else {
        await removeMutation(mutation.id);
      }
      failed++;
    }
  }

  return { success, failed };
}

// Auto-sync when online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    syncPendingMutations().catch((err) => console.error("Offline queue sync failed:", err));
  });
}
