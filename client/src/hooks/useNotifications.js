import { useState, useEffect } from "react";
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "../utils/notifications";

export const useNotifications = (userId, token) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setIsSupported(supported);

    if (!supported) {
      return;
    }

    // Check notification permission status
    if (Notification.permission === "granted") {
      setIsEnabled(true);
    } else if (Notification.permission === "denied") {
      setIsEnabled(false);
    } else {
      setIsEnabled(false);
    }
  }, [userId, token]);

  const enableNotifications = async () => {
    setIsLoading(true);
    try {
      // First request permission
      const permissionGranted = await requestNotificationPermission();

      if (permissionGranted) {
        // Then subscribe to push
        const subscribed = await subscribeToPushNotifications(userId, token);

        if (subscribed) {
          setIsEnabled(true);
        } else {
          setIsEnabled(false);
        }
      } else {
        setIsEnabled(false);
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  };

  const disableNotifications = async () => {
    setIsLoading(true);
    try {
      const unsubscribed = await unsubscribeFromPushNotifications(token);

      if (unsubscribed) {
        setIsEnabled(false);
      } else {
        setIsEnabled(false); // Still disable in UI since user requested it
      }
    } catch (error) {
      console.error("Error disabling notifications:", error);
      setIsEnabled(false); // Disable in UI even if backend fails
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isEnabled,
    isLoading,
    enableNotifications,
    disableNotifications,
  };
};
