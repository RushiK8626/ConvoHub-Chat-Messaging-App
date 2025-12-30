const redis = require('../config/redis');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MESSAGE_CACHE_SIZE = 100;
const MESSAGE_TTL = 3600;
const CHAT_MESSAGES_TTL = 1800;

const cacheMessage = async (message) => {
  try {
    const messageKey = `message:${message.message_id}`;
    await redis.set(messageKey, JSON.stringify(message), { EX: MESSAGE_TTL });
    return true;
  } catch (error) {
    return false;
  }
};

const getCachedMessage = async (messageId) => {
  try {
    const messageKey = `message:${messageId}`;
    const cached = await redis.get(messageKey);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
};

const cacheRecentMessages = async (chatId, userId, messages) => {
  try {
    const chatMessagesKey = `chat:messages:${chatId}:user:${userId}`;
    await redis.del(chatMessagesKey);
    
    const messageIds = messages.map(m => String(m.message_id));
    if (messageIds.length > 0) await redis.rPush(chatMessagesKey, ...messageIds);
    
    await redis.expire(chatMessagesKey, CHAT_MESSAGES_TTL);
    await Promise.all(messages.map(msg => cacheMessage(msg)));
    await redis.set(`chat:messages:updated:${chatId}:user:${userId}`, String(Date.now()), { EX: CHAT_MESSAGES_TTL });
    
    return true;
  } catch (error) {
    return false;
  }
};

const getCachedRecentMessages = async (chatId, userId, limit = 50) => {
  try {
    const chatMessagesKey = `chat:messages:${chatId}:user:${userId}`;
    const messageIds = await redis.lRange(chatMessagesKey, -limit, -1);
    
    if (!messageIds || messageIds.length === 0) return null;
    
    const messages = await Promise.all(messageIds.reverse().map(async (id) => await getCachedMessage(parseInt(id))));
    const validMessages = messages.filter(m => m !== null);
    
    if (validMessages.length < messageIds.length * 0.8) return null;
    
    return validMessages;
  } catch (error) {
    return null;
  }
};

const addMessageToCache = async (chatId, message) => {
  try {
    await cacheMessage(message);
    await invalidateChatCache(chatId);
    return true;
  } catch (error) {
    return false;
  }
};

const removeMessageFromCache = async (messageId, chatId) => {
  try {
    await redis.del(`message:${messageId}`);
    if (chatId) await invalidateChatCache(chatId);
    return true;
  } catch (error) {
    return false;
  }
};

const invalidateChatCache = async (chatId) => {
  try {
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

    let cursor2 = '0';
    do {
      const reply = await redis.scan(cursor2, { MATCH: `chat:messages:updated:${chatId}:user:*`, COUNT: 100 });
      cursor2 = reply.cursor;
      keysToDelete.push(...reply.keys);
    } while (cursor2 !== '0');

    const allMessageIds = new Set();
    for (const key of keysToDelete) {
      if (key.includes(':user:') && !key.includes('updated')) {
        const messageIds = await redis.lRange(key, 0, -1);
        if (messageIds) {
          messageIds.forEach(id => allMessageIds.add(id));
        }
      }
    }

    if (allMessageIds.size > 0) {
      await Promise.all(Array.from(allMessageIds).map(id => redis.del(`message:${id}`)));
    }

    if (keysToDelete.length > 0) {
      await Promise.all(keysToDelete.map(key => redis.del(key)));
    }

    return true;
  } catch (error) {
    return false;
  }
};

const invalidateUserChatCache = async (chatId, userId) => {
  try {
    const chatMessagesKey = `chat:messages:${chatId}:user:${userId}`;
    const updatedKey = `chat:messages:updated:${chatId}:user:${userId}`;
    const messageIds = await redis.lRange(chatMessagesKey, 0, -1);
    await redis.del(chatMessagesKey);
    await redis.del(updatedKey);
    return true;
  } catch (error) {
    return false;
  }
};

const fetchAndCacheMessages = async (chatId, userId, limit = 50) => {
  try {
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
