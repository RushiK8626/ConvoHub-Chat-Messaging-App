const redis = require('../config/redis');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Message Caching Service
 * Caches recent messages to reduce database load
 */

const MESSAGE_CACHE_SIZE = 100; // Number of recent messages to cache per chat
const MESSAGE_TTL = 3600; // 1 hour
const CHAT_MESSAGES_TTL = 1800; // 30 minutes

/**
 * Cache a single message
 * @param {Object} message - Complete message object with relations
 */
const cacheMessage = async (message) => {
  try {
    const messageKey = `message:${message.message_id}`;
    
    // Store message as JSON string (easier to work with complex objects)
    await redis.set(messageKey, JSON.stringify(message), { EX: MESSAGE_TTL });
    
    return true;
  } catch (error) {
    console.error('Error caching message:', error.message);
    return false;
  }
};

/**
 * Get cached message by ID
 * @param {number} messageId
 * @returns {Object|null} message or null if not cached
 */
const getCachedMessage = async (messageId) => {
  try {
    const messageKey = `message:${messageId}`;
    const cached = await redis.get(messageKey);
    
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting cached message:', error.message);
    return null;
  }
};

/**
 * Cache recent messages for a chat-user combination
 * @param {number} chatId
 * @param {number} userId - User ID for user-specific caching
 * @param {Array} messages - Array of message objects
 */
const cacheRecentMessages = async (chatId, userId, messages) => {
  try {
    // Use user-specific cache key to handle visibility differences
    const chatMessagesKey = `chat:messages:${chatId}:user:${userId}`;
    
    // Store message IDs in a list (FIFO)
    // Clear existing list first
    await redis.del(chatMessagesKey);
    
    // Add message IDs (newest first)
    const messageIds = messages.map(m => String(m.message_id));
    if (messageIds.length > 0) {
      await redis.rPush(chatMessagesKey, ...messageIds);
    }
    
    // Set TTL on the list
    await redis.expire(chatMessagesKey, CHAT_MESSAGES_TTL);
    
    // Cache individual messages
    await Promise.all(messages.map(msg => cacheMessage(msg)));
    
    // Store last update timestamp
    await redis.set(`chat:messages:updated:${chatId}:user:${userId}`, String(Date.now()), { EX: CHAT_MESSAGES_TTL });
    
    return true;
  } catch (error) {
    console.error('Error caching recent messages:', error.message);
    return false;
  }
};

/**
 * Get recent messages from cache for a chat-user combination
 * @param {number} chatId
 * @param {number} userId - User ID for user-specific cache retrieval
 * @param {number} limit - Number of messages to retrieve (default: 50)
 * @returns {Array|null} Array of messages or null if not cached
 */
const getCachedRecentMessages = async (chatId, userId, limit = 50) => {
  try {
    // Use user-specific cache key to handle visibility differences
    const chatMessagesKey = `chat:messages:${chatId}:user:${userId}`;
    
    // Get message IDs from list (most recent first)
    const messageIds = await redis.lRange(chatMessagesKey, -limit, -1);
    
    if (!messageIds || messageIds.length === 0) {
      return null; // Cache miss
    }
    
    // Fetch individual messages
    const messages = await Promise.all(
      messageIds.reverse().map(async (id) => {
        return await getCachedMessage(parseInt(id));
      })
    );
    
    // Filter out nulls (in case some messages expired)
    const validMessages = messages.filter(m => m !== null);
    
    // If we lost too many messages, consider it a cache miss
    if (validMessages.length < messageIds.length * 0.8) {
      return null;
    }
    
    return validMessages;
  } catch (error) {
    console.error('Error getting cached recent messages:', error.message);
    return null;
  }
};

/**
 * Add a new message to chat cache for all users
 * Since visibility is per-user, we invalidate all user caches for this chat
 * so they'll fetch fresh data with correct visibility on next request
 * @param {number} chatId
 * @param {Object} message
 */
const addMessageToCache = async (chatId, message) => {
  try {
    // Cache the message itself (individual message cache is shared)
    await cacheMessage(message);
    
    // Invalidate all user-specific caches for this chat
    // This forces a fresh DB query on next request, ensuring correct visibility
    await invalidateChatCache(chatId);
    
    return true;
  } catch (error) {
    console.error('Error adding message to cache:', error.message);
    return false;
  }
};

/**
 * Remove message from cache (when deleted)
 * @param {number} messageId
 * @param {number} chatId
 */
const removeMessageFromCache = async (messageId, chatId) => {
  try {
    // Remove from individual message cache
    await redis.del(`message:${messageId}`);
    
    // Invalidate all user-specific caches for this chat
    if (chatId) {
      await invalidateChatCache(chatId);
    }
    
    return true;
  } catch (error) {
    console.error('Error removing message from cache:', error.message);
    return false;
  }
};

/**
 * Invalidate (clear) chat message cache for all users
 * @param {number} chatId
 */
const invalidateChatCache = async (chatId) => {
  try {
    // Use SCAN to find all user-specific cache keys for this chat
    let cursor = '0';
    const keysToDelete = [];
    
    do {
      const reply = await redis.scan(cursor, {
        MATCH: `chat:messages:${chatId}:user:*`,
        COUNT: 100
      });
      
      cursor = reply.cursor;
      keysToDelete.push(...reply.keys);
    } while (cursor !== '0');
    
    // Also look for updated timestamps
    let cursor2 = '0';
    do {
      const reply = await redis.scan(cursor2, {
        MATCH: `chat:messages:updated:${chatId}:user:*`,
        COUNT: 100
      });
      
      cursor2 = reply.cursor;
      keysToDelete.push(...reply.keys);
    } while (cursor2 !== '0');
    
    // Get all message IDs from all user caches before clearing
    const allMessageIds = new Set();
    for (const key of keysToDelete) {
      if (key.includes(':user:') && !key.includes('updated')) {
        const messageIds = await redis.lRange(key, 0, -1);
        if (messageIds) {
          messageIds.forEach(id => allMessageIds.add(id));
        }
      }
    }
    
    // Delete individual message caches
    if (allMessageIds.size > 0) {
      await Promise.all(
        Array.from(allMessageIds).map(id => redis.del(`message:${id}`))
      );
    }
    
    // Delete all chat-user cache keys
    if (keysToDelete.length > 0) {
      await Promise.all(keysToDelete.map(key => redis.del(key)));
    }
    
    return true;
  } catch (error) {
    console.error('Error invalidating chat cache:', error.message);
    return false;
  }
};

/**
 * Invalidate chat message cache for a specific user
 * @param {number} chatId
 * @param {number} userId
 */
const invalidateUserChatCache = async (chatId, userId) => {
  try {
    const chatMessagesKey = `chat:messages:${chatId}:user:${userId}`;
    const updatedKey = `chat:messages:updated:${chatId}:user:${userId}`;
    
    // Get message IDs before clearing
    const messageIds = await redis.lRange(chatMessagesKey, 0, -1);
    
    // Delete individual message caches (if not used by others, they'll just expire)
    // Note: We don't delete individual messages as other users might still need them
    
    // Delete user-specific cache keys
    await redis.del(chatMessagesKey);
    await redis.del(updatedKey);
    
    return true;
  } catch (error) {
    console.error('Error invalidating user chat cache:', error.message);
    return false;
  }
};

/**
 * Fetch and cache recent messages from database
 * @param {number} chatId
 * @param {number} userId - For visibility filtering
 * @param {number} limit
 * @returns {Array} messages
 */
const fetchAndCacheMessages = async (chatId, userId, limit = 50) => {
  try {
    console.log('Fetching messages for chatId:', chatId, 'userId:', userId, 'limit:', limit);
    
    // Fetch from database (chatId and userId already parsed as integers)
    const messages = await prisma.message.findMany({
      where: {
        chat_id: chatId,
        visibility: {
          some: {
            user_id: userId,
            is_visible: true
          }
        }
      },
      include: {
        sender: {
          select: {
            user_id: true,
            username: true,
            full_name: true,
            profile_pic: true
          }
        },
        attachments: {
          select: {
            attachment_id: true,
            file_url: true,
            original_filename: true,
            file_type: true,
            file_size: true
          }
        },
        status: {
          where: {
            user_id: userId
          }
        },
        referenced_message: {
          select: {
            message_id: true,
            message_text: true,
            sender: {
              select: {
                user_id: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: MESSAGE_CACHE_SIZE
    });
    
    // Cache the messages with user-specific key
    if (messages.length > 0) {
      await cacheRecentMessages(chatId, userId, messages);
    }
    
    // Return only the requested limit
    return messages.slice(0, limit);
  } catch (error) {
    console.error('Error fetching and caching messages:', error.message);
    throw error;
  }
};

/**
 * Get messages (cache-first strategy)
 * @param {number} chatId
 * @param {number} userId
 * @param {number} limit
 * @returns {Array} messages
 */
const getMessages = async (chatId, userId, limit = 50) => {
  try {
    // Validate and parse inputs
    const parsedChatId = parseInt(chatId);
    const parsedUserId = parseInt(userId);
    const parsedLimit = parseInt(limit) || 50;
    
    if (isNaN(parsedChatId) || isNaN(parsedUserId)) {
      throw new Error(`Invalid parameters: chatId=${chatId}, userId=${userId}`);
    }
    
    // Try cache first (now user-specific)
    const cached = await getCachedRecentMessages(parsedChatId, parsedUserId, parsedLimit);
    
    if (cached && cached.length > 0) {
      console.log(`Cache HIT for chat ${parsedChatId} user ${parsedUserId} - ${cached.length} messages`);
      return cached;
    }
    
    // Cache miss - fetch from database and cache
    console.log(`Cache MISS for chat ${parsedChatId} user ${parsedUserId} - fetching from DB`);
    return await fetchAndCacheMessages(parsedChatId, parsedUserId, parsedLimit);
  } catch (error) {
    console.error('Error getting messages:', error.message);
    throw error;
  }
};

module.exports = {
  cacheMessage,
  getCachedMessage,
  cacheRecentMessages,
  getCachedRecentMessages,
  addMessageToCache,
  removeMessageFromCache,
  invalidateChatCache,
  invalidateUserChatCache,
  fetchAndCacheMessages,
  getMessages
};
