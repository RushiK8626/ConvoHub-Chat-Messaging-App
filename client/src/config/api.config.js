// API Configuration for different environments
const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

// Production API URL - used as fallback when env var is not set
const PRODUCTION_API_URL = "https://convohub-api.me";

// You can set these via environment variables
const config = {
  // API Base URL - prioritize environment variables (remove trailing slashes)
  API_BASE_URL: (
    process.env.REACT_APP_API_URL ||
    (isDevelopment ? "http://localhost:3001" : PRODUCTION_API_URL)
  ).replace(/\/+$/, ""),

  // Socket URL - prioritize environment variables (remove trailing slashes)
  SOCKET_URL: (
    process.env.REACT_APP_SOCKET_URL ||
    (isDevelopment ? "http://localhost:3001" : PRODUCTION_API_URL)
  ).replace(/\/+$/, ""),

  // Upload URLs
  getUploadUrl: (type, filename) => {
    const baseUrl = config.API_BASE_URL;
    return `${baseUrl}/uploads/${type}/${filename}`;
  },

  // API Endpoints
  api: {
    auth: {
      login: "/api/auth/login",
      register: "/api/auth/register",
      logout: "/api/auth/logout",
      refreshToken: "/api/auth/refresh-token",
      verifyOtp: "/api/auth/verify-otp",
    },
    users: {
      profile: "/api/users/profile",
      publicById: (userId) => `/api/users/public/id/${userId}`,
      block: (userId) => `/api/users/block/${userId}`,
      unblock: (userId) => `/api/users/unblock/${userId}`,
      blocked: "/api/users/blocked",
    },
    chats: {
      list: "/api/chats",
      info: (chatId) => `/api/chats/${chatId}/info`,
      messages: (chatId) => `/api/chats/${chatId}/messages`,
      create: "/api/chats",
    },
    messages: {
      send: "/api/messages",
      upload: "/api/messages/upload",
      markRead: (messageId) => `/api/messages/${messageId}/read`,
      delete: (messageId) => `/api/messages/${messageId}`,
      deleteBatch: "/api/messages/batch",
      clearChat: (chatId) => `/api/messages/chat/${chatId}/clear`,
    },
    notifications: {
      vapidPublicKey: "/api/notifications/vapid-public-key",
      subscribe: "/api/notifications/subscribe",
      unsubscribe: "/api/notifications/unsubscribe",
      list: "/api/notifications",
      unreadCount: "/api/notifications/unread-count",
      markRead: (notificationId) => `/api/notifications/${notificationId}/read`,
      markAllRead: "/api/notifications/read-all",
      delete: (notificationId) => `/api/notifications/${notificationId}`,
    },
    ai: {
      smartReplies: "/api/ai/smart-replies",
      translate: "/api/ai/translate",
      summarize: "/api/ai/summarize",
      detectLanguage: "/api/ai/detect-language",
      conversationStarters: "/api/ai/conversation-starters",
    },
  },
};

export default config;
