// ============================================================
// lib/pwa/notifications.ts — Push notification utilities
// ============================================================

/** Checks if the browser supports Web Push notifications */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/** Gets current notification permission status */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/** Requests notification permission from the user */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  return Notification.requestPermission();
}

/**
 * Subscribes the current browser to Web Push.
 * Requires the service worker to be registered and a VAPID public key.
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });
    return subscription;
  } catch (err) {
    console.error("[Push] subscribe failed", err);
    return null;
  }
}

/** Unsubscribes the current browser from Web Push */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Gets the current push subscription if active */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Converts a VAPID base64 public key to Uint8Array (required by pushManager.subscribe) */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const uint8 = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    uint8[i] = rawData.charCodeAt(i);
  }
  return uint8.buffer as ArrayBuffer;
}

/** Serialises a PushSubscription to send to the API */
export function serializePushSubscription(sub: PushSubscription): {
  endpoint: string;
  p256dh: string;
  auth_key: string;
} {
  const raw = sub.toJSON();
  return {
    endpoint: raw.endpoint!,
    p256dh: raw.keys?.p256dh ?? "",
    auth_key: raw.keys?.auth ?? "",
  };
}
