import React from "react";
import { Check, CheckCheck } from "lucide-react";

const MessageStatusIndicator = ({ messageId, statuses, currentUserId }) => {
  if (!messageId) return null;

  if (!statuses || Object.keys(statuses).length === 0) {
    return (
      <Check
        size={14}
        style={{
          marginLeft: 4,
          opacity: 0.7,
          color: "currentColor",
        }}
      />
    );
  }

  let highestStatus = "sent";

  const otherUsersStatuses = Object.entries(statuses)
    .filter(([uid]) => uid.toString() !== currentUserId?.toString())
    .map(([, status]) => status);

  if (otherUsersStatuses.some((s) => s === "read")) {
    highestStatus = "read";
  } else if (otherUsersStatuses.some((s) => s === "delivered")) {
    highestStatus = "delivered";
  }

  if (highestStatus === "sent") {
    return (
      <Check
        size={14}
        style={{
          marginLeft: 4,
          opacity: 0.7,
          color: "currentColor",
        }}
      />
    );
  }

  if (highestStatus === "delivered") {
    return (
      <CheckCheck
        size={14}
        style={{
          marginLeft: 4,
          opacity: 0.7,
          color: "currentColor",
        }}
      />
    );
  }

  return (
    <CheckCheck
      size={14}
      style={{
        marginLeft: 4,
        color: "#007AFF",
        fill: "#007AFF",
      }}
    />
  );
};

export default MessageStatusIndicator;
