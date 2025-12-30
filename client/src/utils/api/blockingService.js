/**
 * User Blocking Service
 * Handles all blocking/unblocking operations
 */

import { apiPost, apiDelete, apiGet } from "./apiClient";

const API_BASE_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

/**
 * Block a user
 * @param {number} blockedUserId - The ID of the user to block
 * @returns {Promise<Object>} Response data
 */
export const blockUser = async (blockedUserId) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.user_id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const url = `${API_BASE_URL}/api/users/${userId}/block`;
  return await apiPost(url, { blockedUserId });
};

/**
 * Unblock a user
 * @param {number} blockedUserId - The ID of the user to unblock
 * @returns {Promise<Object>} Response data
 */
export const unblockUser = async (blockedUserId) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.user_id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const url = `${API_BASE_URL}/api/users/${userId}/unblock/${blockedUserId}`;
  return await apiDelete(url);
};

/**
 * Get list of blocked users
 * @returns {Promise<Array>} List of blocked users
 */
export const getBlockedUsers = async () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.user_id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const url = `${API_BASE_URL}/api/users/${userId}/blocked`;
  return await apiGet(url);
};

/**
 * Check if a specific user is blocked
 * @param {number} targetUserId - The ID of the user to check
 * @returns {Promise<boolean>} True if the user is blocked
 */
export const isUserBlocked = async (targetUserId) => {
  try {
    const blockedUsers = await getBlockedUsers();
    return blockedUsers.some(
      (blockedUser) => blockedUser.blockedUser.user_id === targetUserId
    );
  } catch (error) {
    console.error("Error checking if user is blocked:", error);
    return false;
  }
};

export const checkBlockStatus = async (userId, otherUserId) => {
  const url = `${API_BASE_URL}/api/users/${userId}/block-status/${otherUserId}`;
  return await apiGet(url);
};

export default {
  blockUser,
  unblockUser,
  getBlockedUsers,
  isUserBlocked,
  checkBlockStatus,
};
