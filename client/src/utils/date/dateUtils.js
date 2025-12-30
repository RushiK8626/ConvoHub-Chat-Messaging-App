/**
 * Format timestamp based on when the message was sent
 * - Today: Show only time (HH:MM)
 * - Yesterday: Show "Yesterday"
 * - Older: Show date (DD/MM/YY)
 */
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return "";

  const messageDate = new Date(timestamp);
  const today = new Date();

  // Reset time to midnight for comparison
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const messageMidnight = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate()
  );

  const diffInDays = Math.floor(
    (todayMidnight - messageMidnight) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays === 0) {
    // Today - show only time (HH:MM)
    return messageDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } else if (diffInDays === 1) {
    // Yesterday
    return "Yesterday";
  } else {
    // Older - show date (DD/MM/YY)
    const day = String(messageDate.getDate()).padStart(2, "0");
    const month = String(messageDate.getMonth() + 1).padStart(2, "0");
    const year = String(messageDate.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }
};

/**
 * Format timestamp for chat preview (can be more concise)
 */
export const formatChatPreviewTime = (timestamp) => {
  return formatMessageTime(timestamp);
};

/**
 * Format last seen time as "X ago" format
 * Shows minutes, hours, days, months, or years
 */
export const formatLastSeen = (timestamp) => {
  if (!timestamp) return "";

  const lastSeenDate = new Date(timestamp);
  const now = new Date();
  const diffInMs = now - lastSeenDate;

  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInMinutes < 1) {
    return "just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  } else {
    return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
  }
};
