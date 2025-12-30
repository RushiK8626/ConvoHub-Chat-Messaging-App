const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

/**
 * Send a message to the AI assistant
 * @param {string} message - User's message
 * @param {Array} conversationHistory - Previous messages [{role: 'user'|'assistant', content: string}]
 * @returns {Promise<Object>} - AI response with response text and timestamp
 */
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get AI response');
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
