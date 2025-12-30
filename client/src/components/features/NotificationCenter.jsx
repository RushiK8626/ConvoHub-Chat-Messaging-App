import React, { useState } from "react";
import { Bell } from "lucide-react";
import { useFetchNotifications } from "../../hooks/useFetchNotifications";
import "./NotificationCenter.css";

export const NotificationCenter = ({ token, userId }) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    fetchNotifications,
  } = useFetchNotifications(token, userId);

  const [isOpen, setIsOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.notification_id);
    }

    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;

    setShowClearConfirm(true);
  };

  const confirmClearAll = async () => {
    await clearAllNotifications();
    setShowClearConfirm(false);
  };

  const handleNotificationPanelOpen = async () => {
    if (!isOpen) {
      // Only fetch when opening the panel
      await fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="notification-center">
      {/* Notification Bell Icon */}
      <button
        className="notification-bell"
        onClick={handleNotificationPanelOpen}
        title="Notifications"
      >
        <Bell size={24} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="header-actions">
              {unreadCount > 0 && (
                <button
                  className="mark-all-read-btn"
                  onClick={() => markAllAsRead()}
                  title="Mark all notifications as read"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="clear-all-btn"
                  onClick={handleClearAll}
                  title="Delete all notifications"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Clear All Confirmation Dialog */}
          {showClearConfirm && (
            <div className="confirmation-overlay">
              <div className="confirmation-dialog">
                <p>Delete all notifications?</p>
                <div className="confirmation-actions">
                  <button
                    className="confirm-btn delete"
                    onClick={confirmClearAll}
                  >
                    Delete
                  </button>
                  <button
                    className="confirm-btn cancel"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="notification-list">
            {isLoading ? (
              <p className="loading">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="empty">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  className={`notification-item ${
                    !notification.is_read ? "unread" : ""
                  }`}
                >
                  <div
                    className="notification-content"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <p className="notification-message">
                      {notification.message}
                    </p>
                    <small className="notification-time">
                      {new Date(notification.created_at).toLocaleString()}
                    </small>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.notification_id);
                    }}
                    title="Delete notification"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
