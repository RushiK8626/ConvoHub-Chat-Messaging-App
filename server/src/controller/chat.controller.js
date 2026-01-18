const userCacheService = require('../services/user-cache.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.searchChats = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    const pageNum = parseInt(page) > 0 ? parseInt(page) : 1;
    const limitNum = parseInt(limit) > 0 ? parseInt(limit) : 10;

    const privateChatsRaw = await prisma.chat.findMany({
      where: { chat_type: 'private' },
      include: {
        members: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true,
                full_name: true,
                profile_pic: true
              }
            }
          }
        }
      }
    });
    const q = query.toLowerCase();
    let privateChats = privateChatsRaw.filter(chat =>
      chat.members.some(m =>
        (m.user.username && m.user.username.toLowerCase().includes(q)) ||
        (m.user.full_name && m.user.full_name.toLowerCase().includes(q))
      )
    );
    const privateTotal = privateChats.length;
    privateChats = privateChats.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const groupChatsRaw = await prisma.chat.findMany({
      where: { chat_type: 'group' },
      select: { chat_id: true, chat_name: true }
    });
    let groupChats = groupChatsRaw.filter(chat =>
      chat.chat_name && chat.chat_name.toLowerCase().includes(q)
    );
    const groupTotal = groupChats.length;
    groupChats = groupChats.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      privateChats: privateChats.map(chat => ({
        chat_id: chat.chat_id,
        members: chat.members.map(m => m.user)
      })),
      privateTotal,
      groupChats,
      groupTotal,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search chats' });
  }
};

const notificationService = require('../services/notification.service');

exports.createChat = async (req, res) => {
  try {
    const { chat_type, chat_name, member_ids, admin_id, description } = req.body;
    let groupImagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!chat_type || !['private', 'group'].includes(chat_type)) {
      return res.status(400).json({ error: 'Invalid chat type. Must be "private" or "group"' });
    }

    let parsedMemberIds = member_ids;

    if (!member_ids) {
      return res.status(400).json({ error: 'member_ids array is required' });
    }

    if (typeof member_ids === 'string') {
      try {
        parsedMemberIds = JSON.parse(member_ids);
      } catch (e) {
        return res.status(400).json({ error: 'member_ids must be a valid JSON array string' });
      }
    }

    if (!Array.isArray(parsedMemberIds) || parsedMemberIds.length === 0) {
      return res.status(400).json({ error: 'member_ids must be a non-empty array' });
    }

    if (chat_type === 'private' && parsedMemberIds.length !== 2) {
      return res.status(400).json({ error: 'Private chat must have exactly 2 members' });
    }
    if (chat_type === 'group' && !chat_name) {
      return res.status(400).json({ error: 'Group chat must have a chat_name' });
    }
    if (chat_type === 'group' && !admin_id) {
      return res.status(400).json({ error: 'Group chat must have an admin_id' });
    }
    if (chat_type === 'group' && !parsedMemberIds.includes(parseInt(admin_id))) {
      return res.status(400).json({ error: 'Admin must be a member of the group' });
    }

    const users = await prisma.user.findMany({
      where: { user_id: { in: parsedMemberIds.map(id => parseInt(id)) } }
    });
    if (users.length !== parsedMemberIds.length) {
      return res.status(404).json({ error: 'One or more users not found' });
    }

    let privateChatKey = null;
    if (chat_type === 'private') {
      const sortedIds = [...parsedMemberIds].sort((a, b) => a - b);
      privateChatKey = sortedIds.join('_');

      const existingChat = await prisma.chat.findFirst({
        where: {
          chat_type: 'private',
          private_chat_key: privateChatKey
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  user_id: true,
                  username: true,
                  full_name: true,
                  profile_pic: true
                }
              }
            }
          }
        }
      });

      if (existingChat) {
        return res.status(200).json({
          message: 'Private chat already exists',
          chat: existingChat
        });
      }
    }

    const chat = await prisma.chat.create({
      data: {
        chat_type,
        chat_name: chat_type === 'group' ? chat_name : null,
        description: chat_type === 'group' && description ? description : null,
        chat_image: groupImagePath,
        private_chat_key: privateChatKey,
        members: {
          create: parsedMemberIds.map(user_id => ({
            user_id: parseInt(user_id),
            joined_at: new Date(),
            role: chat_type === 'group' && parseInt(user_id) === parseInt(admin_id) ? 'admin' : 'member'
          }))
        },
        ...(chat_type === 'group' && admin_id && {
          admins: {
            create: {
              user_id: parseInt(admin_id)
            }
          }
        })
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true,
                full_name: true,
                profile_pic: true,
                status_message: true
              }
            }
          }
        },
        admins: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true,
                full_name: true
              }
            }
          }
        }
      }
    });

    await prisma.chatVisibility.createMany({
      data: parsedMemberIds.map(user_id => ({
        chat_id: chat.chat_id,
        user_id: parseInt(user_id),
        is_visible: true,
        is_archived: false
      })),
      skipDuplicates: true
    });

    res.status(201).json({ message: 'Chat created successfully', chat });

    for (const memberId of parsedMemberIds) {
      await userCacheService.invalidateChatMemberships(parseInt(memberId));
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create chat' });
  }
};

exports.getChatById = async (req, res) => {
  try {
    const { id } = req.params;

    const chat = await prisma.chat.findUnique({
      where: { chat_id: parseInt(id) },
      include: {
        members: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true,
                full_name: true,
                profile_pic: true,
                status_message: true,
                is_online: true
              }
            }
          }
        },
        admins: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true,
                full_name: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { created_at: 'desc' },
          include: {
            sender: {
              select: {
                user_id: true,
                username: true,
                full_name: true
              }
            },
            status: true
          },
        }
      }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get chat' });
  }
};

exports.getUserChats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (parseInt(page) === 1) {
      const cachedChats = await userCacheService.getCachedChatMemberships(parseInt(userId));
      if (cachedChats) return res.json({ chats: cachedChats });
    }

    const chats = await prisma.chat.findMany({
      where: {
        AND: [
          {
            members: {
              some: {
                user_id: parseInt(userId)
              }
            }
          },
          {
            chatVisibility: {
              some: {
                user_id: parseInt(userId),
                is_visible: true
              }
            }
          }
        ]
      },
      skip,
      take: parseInt(limit),
      include: {
        members: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true,
                full_name: true,
                profile_pic: true
              }
            }
          }
        },
        admins: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true
              }
            }
          }
        },
        messages: {
          take: 1,
          where: {
            messageVisibility: {
              some: {
                user_id: userId,
                is_visible: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          include: {
            sender: {
              select: {
                user_id: true,
                username: true,
                full_name: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json({ chats, count: chats.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get chats' });
  }
};

exports.getUserChatsPreview = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userIdInt = parseInt(userId);

    const unreadCountsPerChat = await prisma.message.groupBy({
      by: ['chat_id'],
      where: {
        status: {
          some: {
            user_id: userIdInt,
            status: 'delivered'
          }
        }
      },
      _count: {
        message_id: true 
      }
    });

    const unreadMap = {};
    unreadCountsPerChat.forEach(item => {
      unreadMap[item.chat_id] = item._count.message_id;
    });

    const chats = await prisma.chat.findMany({
      where: {
        AND: [
          {
            members: {
              some: {
                user_id: userIdInt
              }
            }
          },
          {
            chatVisibility: {
              some: {
                user_id: userIdInt,
                is_visible: true
              }
            }
          }
        ]
      },
      skip,
      take: parseInt(limit),
      include: {
        members: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true,
                full_name: true,
                profile_pic: true,
                status_message: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { created_at: 'desc' },
          select: {
            message_id: true,
            message_text: true,
            message_type: true,
            created_at: true,
            sender: {
              select: {
                user_id: true,
                username: true,
                full_name: true
              }
            },
            attachments: {
              select: {
                file_type: true,
                file_url: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const chatPreviews = chats.map(chat => {
      const lastMessage = chat.messages[0];
      let preview = {
        chat_id: chat.chat_id,
        chat_type: chat.chat_type,
        chat_name: chat.chat_name,
        chat_image: chat.chat_image,
        created_at: chat.created_at,
        members: chat.members,
        admins: chat.admins,
        last_message: null,
        last_message_timestamp: null,
        unread_count: unreadMap[chat.chat_id] || 0 
      };

      if (lastMessage) {
        let previewText = lastMessage.message_text;
        
        if (lastMessage.attachments && lastMessage.attachments.length > 0 && !lastMessage.message_text) {
          const attachment = lastMessage.attachments[0];
          const fileType = attachment.file_type;
          
          if (fileType) {
            if (fileType.startsWith('image/')) {
              previewText = 'Image';
            } else if (fileType.startsWith('video/')) {
              previewText = 'Video';
            } else if (fileType.startsWith('audio/')) {
              previewText = 'Audio';
            } else if (fileType.includes('pdf')) {
              previewText = 'PDF';
            } else if (fileType.includes('word') || fileType.includes('document')) {
              previewText = 'Document';
            } else if (fileType.includes('excel') || fileType.includes('sheet')) {
              previewText = 'Spreadsheet';
            } else if (fileType.includes('zip') || fileType.includes('rar')) {
              previewText = 'Archive';
            } else {
              previewText = 'Attachment';
            }
          } else {
            previewText = 'File';
          }
        }

        preview.last_message = {
          message_id: lastMessage.message_id,
          message_type: lastMessage.message_type,
          preview_text: previewText,
          created_at: lastMessage.created_at,
          sender: lastMessage.sender,
          has_attachment: lastMessage.attachments && lastMessage.attachments.length > 0
        };
        preview.last_message_timestamp = lastMessage.created_at;
      }

      return preview;
    });

    const totalCount = await prisma.chat.count({
      where: {
        AND: [
          {
            members: {
              some: {
                user_id: parseInt(userId)
              }
            }
          },
          {
            chatVisibility: {
              some: {
                user_id: parseInt(userId),
                is_visible: true
              }
            }
          }
        ]
      }
    });

    res.json({
      chats: chatPreviews,
      count: chatPreviews.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get chats preview' });
  }
};

exports.addChatMember = async (req, res, io) => {
  try {
    const { chatId } = req.params;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const chat = await prisma.chat.findUnique({
      where: { chat_id: parseInt(chatId) },
      include: {
        members: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true,
                full_name: true,
                profile_pic: true
              }
            }
          }
        }
      }
    });

    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.chat_type !== 'group') {
      return res.status(400).json({ error: 'Can only add members to group chats' });
    }

    const existingMember = await prisma.chatMember.findUnique({
      where: {
        chat_id_user_id: {
          chat_id: parseInt(chatId),
          user_id: parseInt(user_id)
        }
      }
    });

    if (existingMember) return res.status(409).json({ error: 'User is already a member' });

    const newUser = await prisma.user.findUnique({
      where: { user_id: parseInt(user_id) },
      select: {
        user_id: true,
        username: true,
        full_name: true,
        profile_pic: true,
        is_online: true,
        last_seen: true
      }
    });

    if (!newUser) return res.status(404).json({ error: 'User not found' });

    const member = await prisma.chatMember.create({
      data: {
        chat_id: parseInt(chatId),
        user_id: parseInt(user_id),
        joined_at: new Date()
      }
    });

    await prisma.chatVisibility.create({
      data: { chat_id: parseInt(chatId), user_id: parseInt(user_id), is_visible: true, is_archived: false }
    });

    if (io) {
      io.to(`chat_${chatId}`).emit('member_added', {
        chat_id: parseInt(chatId),
        member: { user_id: newUser.user_id, username: newUser.username, full_name: newUser.full_name, profile_pic: newUser.profile_pic },
        timestamp: new Date(),
        message: `${newUser.full_name || newUser.username} joined the group`
      });

      const currentUser = await prisma.user.findUnique({
        where: { user_id: req.user?.user_id },
        select: { user_id: true, username: true, full_name: true }
      });

      io.to(`user_${user_id}`).emit('you_were_added_to_group', {
        chat_id: parseInt(chatId),
        group_name: chat.chat_name,
        added_by: currentUser?.full_name || 'Admin',
        chat_image: chat.chat_image,
        message: `You were added to "${chat.chat_name}" by ${currentUser?.full_name || 'an admin'}`
      });

      try {
        await notificationService.notifyUserAddedToGroup(user_id, {
          chat_id: parseInt(chatId),
          chat_name: chat.chat_name,
          added_by_username: currentUser?.username || 'Admin'
        });
      } catch (pushError) {}
    }

    res.status(201).json({
      message: 'Member added successfully',
      member: { user_id: newUser.user_id, username: newUser.username, full_name: newUser.full_name, profile_pic: newUser.profile_pic, is_online: newUser.is_online }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
};

exports.removeChatMember = async (req, res, io) => {
  try {
    const { chatId, userId } = req.params;

    const chat = await prisma.chat.findUnique({ where: { chat_id: parseInt(chatId) } });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.chat_type !== 'group') {
      return res.status(400).json({ error: 'Can only remove members from group chats' });
    }

    const member = await prisma.chatMember.findUnique({
      where: {
        chat_id_user_id: {
          chat_id: parseInt(chatId),
          user_id: parseInt(userId)
        }
      },
      include: {
        user: {
          select: {
            user_id: true,
            username: true,
            full_name: true,
            profile_pic: true
          }
        }
      }
    });

    if (!member) return res.status(404).json({ error: 'Member not found in this chat' });

    const removedUserDetails = member.user;

    await prisma.chatMember.delete({
      where: {
        chat_id_user_id: {
          chat_id: parseInt(chatId),
          user_id: parseInt(userId)
        }
      }
    });

    await prisma.chatVisibility.delete({
      where: { chat_id_user_id: { chat_id: parseInt(chatId), user_id: parseInt(userId) } }
    });

    await prisma.groupAdmin.deleteMany({ where: { chat_id: parseInt(chatId), user_id: parseInt(userId) } });

    if (io) {
      io.to(`chat_${chatId}`).emit('member_removed', {
        chat_id: parseInt(chatId),
        removed_member: removedUserDetails,
        timestamp: new Date(),
        message: `${removedUserDetails.full_name || removedUserDetails.username} was removed from the group`
      });

      const currentUser = await prisma.user.findUnique({
        where: { user_id: req.user?.user_id },
        select: { user_id: true, username: true, full_name: true }
      });

      io.to(`user_${userId}`).emit('you_were_removed_from_group', {
        chat_id: parseInt(chatId),
        group_name: chat.chat_name,
        removed_by: currentUser?.full_name || 'Admin',
        message: `You were removed from "${chat.chat_name}" by ${currentUser?.full_name || 'an admin'}`
      });
    }

    const memberCount = await prisma.chatMember.count({ where: { chat_id: parseInt(chatId) } });
    if (memberCount === 0) {
      await prisma.chat.delete({ where: { chat_id: parseInt(chatId) } });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

exports.updateChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { chat_name, description } = req.body;
    let chatImagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const oldChat = await prisma.chat.findUnique({ where: { chat_id: parseInt(id) } });

    const chat = await prisma.chat.update({
      where: { chat_id: parseInt(id) },
      data: {
        ...(chat_name && { chat_name: chat_name.trim() }),
        ...(description && { description: description.trim() }),
        ...(chatImagePath && { chat_image: chatImagePath })
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true,
                full_name: true,
                profile_pic: true
              }
            }
          }
        }
      }
    });

    try {
      const memberIds = chat.members.map(m => m.user.user_id);
      const currentUser = await prisma.user.findUnique({
        where: { user_id: req.user?.user_id },
        select: { username: true }
      });

      let changeType = 'info';
      if (chat_name && oldChat.chat_name !== chat_name) changeType = 'name';
      else if (chatImagePath) changeType = 'image';
      else if (description && oldChat.description !== description) changeType = 'description';

      await notificationService.notifyGroupInfoChange(memberIds, {
        chat_id: parseInt(id),
        chat_name: chat.chat_name,
        change_type: changeType,
        changed_by_username: currentUser?.username || 'Admin'
      });
    } catch (pushError) {}

    res.json({ message: 'Chat updated successfully', chat });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update chat' });
  }
};

exports.getChatInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const chat = await prisma.chat.findUnique({
      where: { chat_id: parseInt(id) },
      select: {
        chat_id: true,
        chat_name: true,
        chat_type: true,
        chat_image: true,
        description: true,
        created_at: true,
        _count: {
          select: { members: true }
        },
        members: {
          include: {
            user: {
              select: {
                user_id: true,
                full_name: true,
                username: true,
                profile_pic: true
              }
            }
          }
        },
        admins: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true,
                full_name: true
              }
            }
          }
        }
      }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({
      chat_id: chat.chat_id,
      chat_name: chat.chat_name,
      chat_type: chat.chat_type,
      chat_image: chat.chat_image,
      description: chat.description,
      created_at: chat.created_at,
      member_count: chat._count.members,
      members: chat.members.map(m => m.user),
      admins: chat.admins.map(a => a.user)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get chat info' });
  }
};

exports.exitGroupChat = async (req, res, io) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.user_id || parseInt(req.body.user_id);
    if (!chatId || !userId) return res.status(400).json({ error: 'chatId and user_id are required' });

    const chatIdInt = parseInt(chatId);
    const userIdInt = parseInt(userId);

    const chat = await prisma.chat.findUnique({
      where: { chat_id: chatIdInt },
      include: { 
        members: { select: { user_id: true } },
        admins: { select: { user_id: true } }
      }
    });

    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.chat_type !== 'group') {
      return res.status(400).json({ error: 'Can only exit group chats. For private chats, use delete chat instead.' });
    }

    const isMember = chat.members.some(m => m.user_id === userIdInt);
    if (!isMember) return res.status(403).json({ error: 'You are not a member of this chat' });

    const exitingUser = await prisma.user.findUnique({
      where: { user_id: userIdInt },
      select: { user_id: true, username: true, full_name: true, profile_pic: true }
    });

    await prisma.chatMember.delete({ where: { chat_id_user_id: { chat_id: chatIdInt, user_id: userIdInt } } });
    await prisma.chatVisibility.deleteMany({ where: { chat_id: chatIdInt, user_id: userIdInt } });
    await prisma.groupAdmin.deleteMany({ where: { chat_id: chatIdInt, user_id: userIdInt } });

    const remainingMembers = await prisma.chatMember.count({ where: { chat_id: chatIdInt } });

    let response = { message: 'Successfully exited group chat', chat_id: chatIdInt, remaining_members: remainingMembers };

    if (io && exitingUser) {
      io.to(`chat_${chatIdInt}`).emit('member_exited', {
        chat_id: chatIdInt,
        exiting_member: exitingUser,
        remaining_members: remainingMembers,
        timestamp: new Date(),
        message: `${exitingUser.full_name || exitingUser.username} left the group`
      });
    }

    if (remainingMembers === 0) {
      await prisma.messageVisibility.deleteMany({ where: { message: { chat_id: chatIdInt } } });
      await prisma.messageStatus.deleteMany({ where: { message: { chat_id: chatIdInt } } });
      await prisma.attachment.deleteMany({ where: { message: { chat_id: chatIdInt } } });
      await prisma.message.deleteMany({ where: { chat_id: chatIdInt } });
      await prisma.groupAdmin.deleteMany({ where: { chat_id: chatIdInt } });
      await prisma.chatVisibility.deleteMany({ where: { chat_id: chatIdInt } });
      await prisma.chat.delete({ where: { chat_id: chatIdInt } });
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to exit group chat' });
  }
};

exports.deleteChat = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.chat.delete({ where: { chat_id: parseInt(id) } });
    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete chat' });
  }
};