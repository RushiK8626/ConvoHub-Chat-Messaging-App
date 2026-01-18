const redis = require('../config/redis');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// TTL configurations (in seconds)
const USER_PROFILE_TTL = 3600; // 1 hour
const CHAT_MEMBERSHIPS_TTL = 1800; // 30 minutes
const FRIEND_LIST_TTL = 1800; // 30 minutes

const cacheUserProfile = async (user) => {
  try {
    const userKey = `user:profile:${user.user_id}`;
    
    await redis.hSet(userKey, {
      user_id: String(user.user_id),
      username: String(user.username || ''),
      email: String(user.email || ''),
      full_name: String(user.full_name || ''),
      phone: String(user.phone || ''),
      profile_pic: String(user.profile_pic || ''),
      status_message: String(user.status_message || ''),
      bio: String(user.bio || ''),
      created_at: user.created_at ? String(user.created_at) : String(Date.now())
    });
    
    await redis.expire(userKey, USER_PROFILE_TTL);
    return true;
  } catch (error) {
    return false;
  }
};

const getCachedUserProfile = async (userId) => {
  try {
    const userKey = `user:profile:${userId}`;
    const cached = await redis.hGetAll(userKey);
    
    if (!cached || Object.keys(cached).length === 0) {
      return null;
    }
    
    return {
      user_id: parseInt(cached.user_id),
      username: cached.username,
      email: cached.email,
      full_name: cached.full_name,
      phone: cached.phone || null,
      profile_pic: cached.profile_pic,
      status_message: cached.status_message || null,
      bio: cached.bio,
      created_at: cached.created_at
    };
  } catch (error) {
    return null;
  }
};

const getUserProfile = async (userId) => {
  try {
    const cached = await getCachedUserProfile(userId);
    if (cached) {
      return cached;
    }
    
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        username: true,
        email: true,
        full_name: true,
        phone: true,
        profile_pic: true,
        status_message: true,
        created_at: true
      }
    });
    
    if (user) {
      await cacheUserProfile(user);
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

const cacheChatMemberships = async (userId, chats) => {
  try {
    const membershipKey = `user:chats:${userId}`;
    
    // Clear existing memberships
    await redis.del(membershipKey);
    
    if (chats.length === 0) {
      return true;
    }
    
    // Store chat IDs as a list
    const chatIds = chats.map(chat => String(chat.chat_id));
    await redis.rPush(membershipKey, chatIds);
    await redis.expire(membershipKey, CHAT_MEMBERSHIPS_TTL);
    
    // Cache individual chat details
    for (const chat of chats) {
      const chatKey = `chat:${chat.chat_id}:member:${userId}`;
      await redis.hSet(chatKey, {
        chat_id: String(chat.chat_id),
        chat_name: String(chat.chat_name || ''),
        chat_type: String(chat.chat_type || 'private'),
        created_at: chat.created_at ? String(chat.created_at) : String(Date.now()),
        is_pinned: String(chat.is_pinned || false)
      });
      await redis.expire(chatKey, CHAT_MEMBERSHIPS_TTL);
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

const getCachedChatMemberships = async (userId) => {
  try {
    const membershipKey = `user:chats:${userId}`;
    const chatIds = await redis.lRange(membershipKey, 0, -1);
    
    if (!chatIds || chatIds.length === 0) {
      return null;
    }
    
    // Get details for each chat
    const chats = [];
    for (const chatId of chatIds) {
      const chatKey = `chat:${chatId}:member:${userId}`;
      const chatData = await redis.hGetAll(chatKey);
      
      if (chatData && Object.keys(chatData).length > 0) {
        chats.push({
          chat_id: parseInt(chatData.chat_id),
          chat_name: chatData.chat_name,
          chat_type: chatData.chat_type,
          created_at: chatData.created_at,
          is_pinned: chatData.is_pinned === 'true'
        });
      }
    }
    
    return chats.length > 0 ? chats : null;
  } catch (error) {
    return null;
  }
};

const getChatMemberships = async (userId) => {
  try {
    const cached = await getCachedChatMemberships(userId);
    if (cached) {
      return cached;
    }
    
    const memberships = await prisma.chatMember.findMany({
      where: { user_id: userId },
      include: {
        chat: {
          select: {
            chat_id: true,
            chat_name: true,
            chat_type: true,
            created_at: true
          }
        }
      }
    });
    
    const chats = memberships.map(m => ({
      chat_id: m.chat.chat_id,
      chat_name: m.chat.chat_name,
      chat_type: m.chat.chat_type,
      created_at: m.chat.created_at,
      is_pinned: m.is_pinned || false
    }));
    
    if (chats.length > 0) {
      await cacheChatMemberships(userId, chats);
    }
    
    return chats;
  } catch (error) {
    throw error;
  }
};

const cacheFriendList = async (userId, friends) => {
  try {
    const friendListKey = `user:friends:${userId}`;
    
    await redis.del(friendListKey);
    
    if (friends.length === 0) {
      return true;
    }
    
    const friendIds = friends.map(friend => String(friend.user_id));
    await redis.rPush(friendListKey, friendIds);
    await redis.expire(friendListKey, FRIEND_LIST_TTL);
    
    for (const friend of friends) {
      await cacheUserProfile(friend);
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

const getCachedFriendList = async (userId) => {
  try {
    const friendListKey = `user:friends:${userId}`;
    const friendIds = await redis.lRange(friendListKey, 0, -1);
    
    if (!friendIds || friendIds.length === 0) {
      return null;
    }
    
    const friends = [];
    for (const friendId of friendIds) {
      const friend = await getCachedUserProfile(parseInt(friendId));
      if (friend) {
        friends.push(friend);
      }
    }
    
    return friends.length > 0 ? friends : null;
  } catch (error) {
    return null;
  }
};

const getFriendList = async (userId) => {
  try {
    const cached = await getCachedFriendList(userId);
    if (cached) {
      return cached;
    }
    
    const friends1 = await prisma.friendship.findMany({
      where: {
        user1_id: userId,
        status: 'accepted'
      },
      include: {
        user2: {
          select: {
            user_id: true,
            username: true,
            email: true,
            full_name: true,
            profile_pic: true,
            bio: true,
            created_at: true
          }
        }
      }
    });
    
    const friends2 = await prisma.friendship.findMany({
      where: {
        user2_id: userId,
        status: 'accepted'
      },
      include: {
        user1: {
          select: {
            user_id: true,
            username: true,
            email: true,
            full_name: true,
            profile_pic: true,
            bio: true,
            created_at: true
          }
        }
      }
    });
    
    const friends = [
      ...friends1.map(f => f.user2),
      ...friends2.map(f => f.user1)
    ];
    
    if (friends.length > 0) {
      await cacheFriendList(userId, friends);
    }
    
    return friends;
  } catch (error) {
    throw error;
  }
};

const invalidateUserProfile = async (userId) => {
  try {
    const userKey = `user:profile:${userId}`;
    await redis.del(userKey);
    return true;
  } catch (error) {
    return false;
  }
};

const invalidateChatMemberships = async (userId) => {
  try {
    const membershipKey = `user:chats:${userId}`;
    const chatIds = await redis.lRange(membershipKey, 0, -1);
    
    await redis.del(membershipKey);
    
    for (const chatId of chatIds) {
      const chatKey = `chat:${chatId}:member:${userId}`;
      await redis.del(chatKey);
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

const invalidateFriendList = async (userId) => {
  try {
    const friendListKey = `user:friends:${userId}`;
    await redis.del(friendListKey);
    return true;
  } catch (error) {
    return false;
  }
};

const invalidateAllUserCaches = async (userId) => {
  try {
    await Promise.all([
      invalidateUserProfile(userId),
      invalidateChatMemberships(userId),
      invalidateFriendList(userId)
    ]);
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  cacheUserProfile,
  getCachedUserProfile,
  getUserProfile,
  invalidateUserProfile,
  
  cacheChatMemberships,
  getCachedChatMemberships,
  getChatMemberships,
  invalidateChatMemberships,
  
  cacheFriendList,
  getCachedFriendList,
  getFriendList,
  invalidateFriendList,
  
  invalidateAllUserCaches
};
