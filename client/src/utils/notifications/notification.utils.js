// Request user permission for notifications
import config from "../../config/api.config";

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        return true;
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
    }
  }
  return false;
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (userId, token) => {
  try {
    // Validate required parameters
    if (!userId) {
      console.error("userId is required for subscribing to notifications");
      return false;
    }
    if (!token) {
      console.error("token is required for subscribing to notifications");
      return false;
    }

    // Check if already supported
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check existing subscription
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      return true;
    }

    // Fetch VAPID public key from backend
    const vapidUrl = `${config.API_BASE_URL}${config.api.notifications.vapidPublicKey}`;

    const vapidResponse = await fetch(vapidUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!vapidResponse.ok) {
      console.error(
        "Failed to fetch VAPID key:",
        vapidResponse.status,
        vapidResponse.statusText
      );
      return false;
    }

    const contentType = vapidResponse.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("VAPID endpoint returned non-JSON response:", contentType);
      return false;
    }

    const vapidData = await vapidResponse.json();

    if (!vapidData.vapidPublicKey) {
      console.error("VAPID key missing in response");
      return false;
    }

    const { vapidPublicKey } = vapidData;

    // Validate VAPID key
    if (!vapidPublicKey) {
      console.error("VAPID public key is empty");
      return false;
    }

    // Try to convert VAPID key
    let vapidUint8Array;
    try {
      vapidUint8Array = urlBase64ToUint8Array(vapidPublicKey);
    } catch (keyError) {
      console.error("Failed to convert VAPID key:", keyError.message);
      return false;
    }

    // Subscribe to push
    let subscription;
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidUint8Array,
      });
    } catch (subscribeError) {
      console.error("Push subscribe failed:", subscribeError.message);

      // Check notification permission
      const permission = Notification.permission;

      if (permission === "denied") {
        console.error("Notification permission is denied");
        return false;
      }

      if (permission === "default") {
        console.error("Notification permission not yet requested");
        return false;
      }

      return false;
    }

    // Send subscription to backend
    const subscriptionJson = subscription.toJSON();

    const subscribeUrl = `${config.API_BASE_URL}${config.api.notifications.subscribe}`;

    const response = await fetch(subscribeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: userId,
        subscription: subscriptionJson,
      }),
    });

    if (!response.ok) {
      const responseData = await response.json();
      console.error(
        "Failed to save subscription:",
        response.status,
        responseData
      );
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (token) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Notify backend
      const unsubscribeUrl = `${config.API_BASE_URL}${config.api.notifications.unsubscribe}`;

      const response = await fetch(unsubscribeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn(
          "Backend unsubscribe notification failed:",
          response.status
        );
      }
      return true;
    } else {
      console.log("[Notifications] No subscription found to remove");
    }
  } catch (error) {
    console.error("Error unsubscribing:", error);
  }
  return false;
};

// Convert VAPID key from base64 to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};
