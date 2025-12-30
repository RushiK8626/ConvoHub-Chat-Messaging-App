/**
 * Authentication utility functions
 */

const API_BASE_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

/**
 * Clear all auth data and redirect to login
 * Use this when session expires or user logs out
 */
export const handleSessionExpiry = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "/login";
};

/**
 * Try to refresh the access token
 * @returns {Promise<string|null>} New access token or null if refresh fails
 */
export const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      handleSessionExpiry();
      return null;
    }

    const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: String(refreshToken) }),
    });

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      localStorage.setItem("accessToken", refreshData.accessToken);

      // Update user info if provided
      if (refreshData.user) {
        localStorage.setItem("user", JSON.stringify(refreshData.user));
      }

      return refreshData.accessToken;
    } else {
      // Refresh failed - session expired
      handleSessionExpiry();
      return null;
    }
  } catch (error) {
    console.error("Error refreshing token:", error);
    handleSessionExpiry();
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user has valid tokens
 */
export const isAuthenticated = () => {
  const accessToken = localStorage.getItem("accessToken");
  const user = localStorage.getItem("user");
  return !!(accessToken && user);
};

/**
 * Get current user from localStorage
 * @returns {Object|null} User object or null
 */
export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export default {
  handleSessionExpiry,
  refreshAccessToken,
  isAuthenticated,
  getCurrentUser,
};
