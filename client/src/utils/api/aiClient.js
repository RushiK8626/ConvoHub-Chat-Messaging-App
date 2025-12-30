/**
 * AI Client for ConvoHub
 * Handles all AI-related API calls: smart replies, translation, summarization, etc.
 */

import { apiPost } from "./apiClient";

const API_BASE_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

/**
 * Get smart reply suggestions for a chat
 * @param {number} chatId - The chat ID
 * @param {number} limit - Maximum number of suggestions (default: 3)
 * @returns {Promise<string[]>} Array of suggested replies
 */
export const getSmartReplies = async (chatId, limit = 3) => {
  try {
    const response = await apiPost(`${API_BASE_URL}/api/ai/smart-replies`, {
      chat_id: chatId,
      limit: limit,
    });
    return response.suggestions || response || [];
  } catch (error) {
    console.error("Error getting smart replies:", error);
    throw error;
  }
};

/**
 * Translate text to target language
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code (e.g., 'es', 'fr', 'de')
 * @returns {Promise<Object>} Translation result with translatedText
 */
export const translateText = async (text, targetLanguage) => {
  try {
    const response = await apiPost(`${API_BASE_URL}/api/ai/translate`, {
      text: text,
      target_language: targetLanguage,
    });
    return response;
  } catch (error) {
    console.error("Error translating text:", error);
    throw error;
  }
};

/**
 * Summarize a chat conversation
 * @param {number} chatId - The chat ID
 * @param {string} summaryType - Type of summary ('brief', 'detailed', 'bullet')
 * @returns {Promise<Object>} Summary result with summary text
 */
export const summarizeChat = async (chatId, summaryType = "brief") => {
  try {
    const response = await apiPost(`${API_BASE_URL}/api/ai/summarize`, {
      chat_id: chatId,
      summary_type: summaryType,
    });
    return response;
  } catch (error) {
    console.error("Error summarizing chat:", error);
    throw error;
  }
};

/**
 * Detect language of text
 * @param {string} text - Text to analyze
 * @returns {Promise<Object>} Language detection result with languageCode
 */
export const detectLanguage = async (text) => {
  try {
    const response = await apiPost(`${API_BASE_URL}/api/ai/detect-language`, {
      text: text,
    });
    return response;
  } catch (error) {
    console.error("Error detecting language:", error);
    throw error;
  }
};

/**
 * Get conversation starter suggestions
 * @param {number} chatId - The chat ID
 * @returns {Promise<Object>} Conversation starters with starters array
 */
export const getConversationStarters = async (chatId) => {
  try {
    const response = await apiPost(
      `${API_BASE_URL}/api/ai/conversation-starters`,
      {
        chat_id: chatId,
      }
    );
    return response;
  } catch (error) {
    console.error("Error getting conversation starters:", error);
    throw error;
  }
};

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

export const sendAIMessage = async (message, conversationHistory = []) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`${API_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, conversation_history: conversationHistory }),
  });

  if (!response.ok) {
    throw new Error('Failed to get AI response');
  }

  return response.json();
};

// AI Assistant info constant
export const AI_ASSISTANT = {
  id: 'ai-assistant',
  name: 'AI Assistant',
  avatar: '🤖',
  description: 'Your helpful AI companion powered by Gemini',
  isAI: true,
};

export default {
  getSmartReplies,
  translateText,
  summarizeChat,
  detectLanguage,
  getConversationStarters,
};
