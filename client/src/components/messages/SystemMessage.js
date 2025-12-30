import React from "react";
import "./SystemMessage.css";

/**
 * SystemMessage Component
 *
 * Displays non-messaging content like member joins, leaves, chat name changes, etc.
 * Styled similar to WhatsApp system messages (centered, subtle gray background).
 *
 * Props:
 * - type: 'member_added' | 'member_removed' | 'member_exited' | 'chat_name_changed' | etc.
 * - message: The text message to display
 * - timestamp: ISO timestamp string
 * - icon: Optional React component to display
 */
const SystemMessage = ({ type = "info", message, timestamp, icon: Icon }) => {
  const formatTime = (isoTime) => {
    if (!isoTime) return "";
    try {
      const date = new Date(isoTime);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="system-message-container">
      <div className={`system-message system-message--${type}`}>
        {Icon && (
          <span className="system-message__icon">
            <Icon size={16} />
          </span>
        )}
        <span className="system-message__text">{message}</span>
        {timestamp && (
          <span className="system-message__time">{formatTime(timestamp)}</span>
        )}
      </div>
    </div>
  );
};

export default SystemMessage;
