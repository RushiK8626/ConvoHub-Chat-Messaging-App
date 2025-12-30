import React, { useEffect, useState } from "react";
import { useNotifications } from "../hooks/useNotifications";
import "./NotificationSettings.css";
import PageHeader from "../components/PageHeader";
import { useNavigate, useLocation } from "react-router-dom";
import useResponsive from "../hooks/useResponsive";

const NotificationSettings = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const isWideScreen = useResponsive();
  const [error, setError] = useState(null);

  // Handle responsive layout changes - navigate to settings page when screen becomes wide
  useEffect(() => {
    if (!isEmbedded && isWideScreen) {
      navigate("/settings", { state: { selectedSettingId: "notifications" } });
    }
  }, [isWideScreen, isEmbedded, navigate]);

  // Get userId and token from localStorage for this page
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.id || user?.user_id; // Try 'id' first, fall back to 'user_id'
  const token = localStorage.getItem("accessToken");

  const {
    isSupported,
    isEnabled,
    isLoading,
    enableNotifications,
    disableNotifications,
  } = useNotifications(userId, token);

  // Handle toggle with better error feedback
  const handleToggle = async (e) => {
    setError(null);
    const checked = e.target.checked;

    if (checked) {
      // Enable notifications
      if (!userId || !token) {
        const msg = "Missing credentials. Please log in again.";
        setError(msg);
        console.error(msg);
        return;
      }
      await enableNotifications();
    } else {
      // Disable notifications
      if (!token) {
        const msg = "Missing authentication token. Please log in again.";
        setError(msg);
        console.error(msg);
        return;
      }
      await disableNotifications();
    }
  };

  if (!isSupported) {
    return (
      <div className="notification-settings">
        <div className="settings-section">
          <h3>Push Notifications</h3>
          <div className="unsupported-message">
            <p>⚠️ Notifications are not supported in your browser</p>
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
      <PageHeader
        title="Notifications"
        onBack={() => {
          if (isEmbedded) {
            navigate(-1); // Go back to previous page in split layout
          } else {
            navigate("/settings");
          }
        }}
      />
      <div className="settings-section">
        <div className="setting-item">
          <h2 className="section-title">Push Notifications</h2>
          <div className="notification-toggle">
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
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={handleToggle}
                disabled={isLoading}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
