/**
 * API Client with automatic token refresh
 * Handles 401 errors by refreshing the access token and retrying the request
 */

import { handleSessionExpiry } from '../auth/auth';

// Ensure the configured base URL does not end with a slash to avoid `//` when joining paths
const API_BASE_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

// Debug: Log the API URL being used
console.log("🌐 API Base URL:", API_BASE_URL);
console.log("🔧 Environment:", process.env.NODE_ENV);

/**
 * Refresh the access token using the refresh token
 * @returns {Promise<string|null>} New access token or null if refresh fails
 */
const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      console.error("No refresh token available");
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
      console.error("Token refresh failed:", refreshRes.status);
      // If refresh fails, redirect to login
      handleSessionExpiry();
      return null;
    }
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
};

/**
 * Make an authenticated API request with automatic token refresh
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} The fetch response
 */
export const apiClient = async (url, options = {}) => {
  let token = localStorage.getItem("accessToken");

  // Add authorization header if not present
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  // First attempt
  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If unauthorized (401), try to refresh token and retry
  if (response.status === 401) {
    console.log("Token expired, attempting refresh...");
    const newToken = await refreshAccessToken();

    if (newToken) {
      // Retry the request with new token
      headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    }
  }

  return response;
};

/**
 * Helper function to make GET requests
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} The parsed JSON response
 */
export const apiGet = async (url, options = {}) => {
  const response = await apiClient(url, {
    ...options,
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `API GET request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
};

/**
 * Helper function to make POST requests
 * @param {string} url - The API endpoint URL
 * @param {Object} body - Request body
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} The parsed JSON response
 */
export const apiPost = async (url, body, options = {}) => {
  const response = await apiClient(url, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `API POST request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
};

/**
 * Helper function to make PUT requests
 * @param {string} url - The API endpoint URL
 * @param {Object} body - Request body
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} The parsed JSON response
 */
export const apiPut = async (url, body, options = {}) => {
  const response = await apiClient(url, {
    ...options,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `API PUT request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
};

/**
 * Helper function to make DELETE requests
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} The parsed JSON response
 */
export const apiDelete = async (url, options = {}) => {
  const response = await apiClient(url, {
    ...options,
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `API DELETE request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
};

export default apiClient;
