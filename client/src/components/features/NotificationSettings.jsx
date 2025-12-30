import React from "react";
import { useNotifications } from "../hooks/useNotifications";
import "./NotificationSettings.css";

export const NotificationSettings = ({ userId, token }) => {
  const {
    isSupported,
    isEnabled,
    isLoading,
    enableNotifications,
    disableNotifications,
  } = useNotifications(userId, token);

  if (!isSupported) {
    return (
      <div className="notification-settings">
        <div className="settings-section">
          <h3>Push Notifications</h3>
          <div className="unsupported-message">
            <p> Notifications are not supported in your browser</p>
            <p className="note">
              This feature requires a modern browser with Service Worker support
              (Chrome, Firefox, Edge, Safari 11+)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-settings">
      <div className="settings-section">
        <h3>Push Notifications</h3>

        <div className="setting-item">
          <div className="setting-content">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => {
                  if (e.target.checked) {
                    enableNotifications();
                  } else {
                    disableNotifications();
                  }
                }}
                disabled={isLoading}
              />
              <span className="toggle-slider"></span>
            </label>
            <div className="toggle-label">
              <span className="toggle-status">
                {isEnabled ? "Enabled" : "Disabled"}
              </span>
              <span className="toggle-description">
                {isEnabled
                  ? "You will receive push notifications for new messages"
                  : "You will not receive push notifications"}
              </span>
            </div>
          </div>

          {isLoading && <div className="loading-spinner">⏳</div>}
        </div>

        <div className="notification-info">
          <p className="info-text">
            Push notifications help you stay updated with new messages even when
            the app is not in focus.
          </p>
        </div>
      </div>
    </div>
  );
};
