import { useState, useEffect } from "react";
import config from "../config/api.config";

export const useFetchNotifications = (token, userId) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async (limit = 20, offset = 0) => {
    if (!token) {
      return [];
    }

    setIsLoading(true);
    try {
      const url = `${config.API_BASE_URL}${config.api.notifications.list}?limit=${limit}&offset=${offset}`;

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch notifications:", response.status);
        setNotifications([]);
        return [];
      }

      const data = await response.json();
      setNotifications(data.data || []);
      setError(null);
      return data.data || [];
    } catch (err) {
      setError(err.message);
      console.error("Error fetching notifications:", err);
      setNotifications([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!token) {
      return;
    }

    try {
      const url = `${config.API_BASE_URL}${config.api.notifications.unreadCount}`;

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        setUnreadCount(0);
        return;
      }

      const data = await response.json();
      setUnreadCount(data.unread_count || 0);

      if ("setAppBadge" in navigator) {
        navigator.setAppBadge(data.unread_count || 0);
      }
    } catch (err) {
      console.error("Error fetching unread count:", err);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const url = `${config.API_BASE_URL}${config.api.notifications.markRead(
        notificationId
      )}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark as read");
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId
            ? { ...n, is_read: true, read_at: new Date() }
            : n
        )
      );

      await fetchUnreadCount();
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const url = `${config.API_BASE_URL}${config.api.notifications.markAllRead}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date() }))
      );

      setUnreadCount(0);

      if ("setAppBadge" in navigator) {
        navigator.clearAppBadge();
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const url = `${config.API_BASE_URL}${config.api.notifications.delete(
        notificationId
      )}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      setNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notificationId)
      );

      await fetchUnreadCount();
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) {
      return;
    }

    try {
      notifications.map((notification) =>
        fetch(
          `${config.API_BASE_URL}${config.api.notifications.delete(
            notification.notification_id
          )}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ).catch((err) => {
          console.error(
            `Failed to delete notification ${notification.notification_id}:`,
            err
          );
          return null;
        })
      );

      setNotifications([]);
      setUnreadCount(0);

      if ("clearAppBadge" in navigator) {
        navigator.clearAppBadge();
      }
    } catch (err) {
      console.error("Error clearing all notifications:", err);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    if (!userId) {
      return;
    }

    fetchNotifications();
    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [token, userId, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  };
};
