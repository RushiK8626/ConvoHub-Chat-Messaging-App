const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const aiService = require('../services/ai.service');

const executeSearchMessages = async (args, userId) => {
  try {
    const { query, chatId, senderUsername, startDate, endDate, limit = 10 } = args;

    // Build the where clause
    const whereClause = {
      message_text: {
        contains: query
      },
      message_type: 'text', // Only search text messages
      // Ensure user has access to these messages (is a member of the chat)
      chat: {
        members: {
          some: {
            user_id: userId
          }
        }
      }
    };

    // Add optional filters
    if (chatId) {
      whereClause.chat_id = parseInt(chatId);
    }

    if (senderUsername) {
      whereClause.sender = {
        username: {
          contains: senderUsername
        }
      };
    }

    if (startDate) {
      whereClause.created_at = {
        ...whereClause.created_at,
        gte: new Date(startDate)
      };
    }

    if (endDate) {
      whereClause.created_at = {
        ...whereClause.created_at,
        lte: new Date(endDate)
      };
    }

    // Execute search
    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            username: true,
            full_name: true,
            profile_pic: true
          }
        },
        chat: {
          select: {
            chat_id: true,
            chat_name: true,
            chat_type: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: Math.min(parseInt(limit), 50) // Max 50 results
    });

    // Format results for AI to understand
    const formattedResults = messages.map(msg => ({
      messageId: msg.message_id,
      text: msg.message_text,
      sender: msg.sender.full_name || msg.sender.username,
      senderUsername: msg.sender.username,
      chatName: msg.chat.chat_name || (msg.chat.chat_type === 'personal' ? 'Direct Message' : 'Group'),
      chatId: msg.chat.chat_id,
      chatType: msg.chat.chat_type,
      timestamp: msg.created_at.toISOString(),
      relativeTime: getRelativeTime(msg.created_at)
    }));

    return {
      success: true,
      query: query,
      totalResults: formattedResults.length,
      messages: formattedResults
    };

  } catch (error) {
    return { success: false, error: error.message, messages: [] };
  }
};

const getRelativeTime = (date) => {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

const functionExecutors = {
  searchMessages: executeSearchMessages
};

exports.generateSmartReplies = async (req, res) => {
  try {
    const { chat_id, limit = 3 } = req.body;
    const userId = req.user.user_id;

    if (!chat_id) {
      return res.status(400).json({ error: 'chat_id is required' });
    }

    // Verify user is a member of the chat
    const chatMember = await prisma.chatMember.findUnique({
      where: {
        chat_id_user_id: {
          chat_id: parseInt(chat_id),
          user_id: userId,
        },
      },
    });

    if (!chatMember) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }

    // Fetch recent messages for context (last 10 messages)
    const messages = await prisma.message.findMany({
      where: {
        chat_id: parseInt(chat_id),
        message_type: 'text', // Only use text messages for context
      },
      include: {
        sender: {
          select: {
            username: true,
            full_name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    if (messages.length === 0) {
      return res.status(400).json({ 
        error: 'No messages found in this chat',
        suggestions: [],
      });
    }

    // Format messages for AI service
    const messageHistory = messages.reverse().map(msg => ({
      sender: msg.sender.username || msg.sender.full_name || 'User',
      text: msg.message_text,
    }));

    // Generate smart replies
    const suggestions = await aiService.generateSmartReplies(
      messageHistory,
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      chat_id: parseInt(chat_id),
      suggestions,
      context_messages: messages.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate smart replies', details: error.message });
  }
};

exports.translateMessage = async (req, res) => {
  try {
    const { message_id, text, target_language, source_language = 'auto' } = req.body;
    const userId = req.user.user_id;

    if (!target_language) {
      return res.status(400).json({ error: 'target_language is required' });
    }

    let messageText = text;

    // If message_id provided, fetch the message
    if (message_id) {
      const message = await prisma.message.findUnique({
        where: { message_id: parseInt(message_id) },
        include: {
          chat: {
            include: {
              members: {
                where: { user_id: userId },
              },
            },
          },
        },
      });

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Verify user has access to this message's chat
      if (message.chat.members.length === 0) {
        return res.status(403).json({ error: 'You do not have access to this message' });
      }

      messageText = message.message_text;
    }

    if (!messageText || !messageText.trim()) {
      return res.status(400).json({ error: 'text or message_id is required' });
    }

    // Translate the message
    const translation = await aiService.translateMessage(
      messageText,
      target_language,
      source_language
    );

    res.status(200).json({
      success: true,
      original_text: messageText,
      ...translation,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to translate message', details: error.message });
  }
};

exports.summarizeConversation = async (req, res) => {
  try {
    const { chat_id, message_count = 50, summary_type = 'brief' } = req.body;
    const userId = req.user.user_id;

    if (!chat_id) {
      return res.status(400).json({ error: 'chat_id is required' });
    }

    // Verify user is a member of the chat
    const chatMember = await prisma.chatMember.findUnique({
      where: {
        chat_id_user_id: {
          chat_id: parseInt(chat_id),
          user_id: userId,
        },
      },
    });

    if (!chatMember) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }

    // Fetch messages to summarize
    const messages = await prisma.message.findMany({
      where: {
        chat_id: parseInt(chat_id),
        message_type: 'text', // Only summarize text messages
      },
      include: {
        sender: {
          select: {
            username: true,
            full_name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: parseInt(message_count),
    });

    if (messages.length === 0) {
      return res.status(400).json({ 
        error: 'No messages found to summarize',
      });
    }

    // Format messages for AI service
    const formattedMessages = messages.reverse().map(msg => ({
      sender: msg.sender.username || msg.sender.full_name || 'User',
      text: msg.message_text,
      timestamp: msg.created_at,
    }));

    // Generate summary
    const summary = await aiService.summarizeConversation(
      formattedMessages,
      summary_type
    );

    res.status(200).json({
      success: true,
      chat_id: parseInt(chat_id),
      summary,
      summary_type,
      messages_analyzed: messages.length,
      time_range: {
        from: messages[0].created_at,
        to: messages[messages.length - 1].created_at,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to summarize conversation', details: error.message });
  }
};

exports.detectLanguage = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    // Detect language
    const result = await aiService.detectLanguage(text);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect language', details: error.message });
  }
};

exports.generateConversationStarters = async (req, res) => {
  try {
    const { chat_id } = req.body;
    const userId = req.user.user_id;

    if (!chat_id) {
      return res.status(400).json({ error: 'chat_id is required' });
    }

    // Fetch chat details
    const chat = await prisma.chat.findUnique({
      where: { chat_id: parseInt(chat_id) },
      include: {
        members: true,
      },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify user is a member
    if (chat.members.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }

    let recipientName = '';
    if (chat.chat_type == 'private') {
      const otherMember = chat.members.find(member => member.user_id !== userId);
      if (otherMember) {
        const user = await prisma.user.findUnique({
          where: { user_id: otherMember.user_id },
          select: { full_name: true }
        });
        recipientName = user?.full_name?.split(' ')[0] || '';
      }
    }

    const context = {
      chatType: chat.is_group_chat ? 'group' : 'direct',
      chatName: chat.chat_name,
      recipientName
    };

    const starters = await aiService.generateConversationStarters(context);
    res.status(200).json({ success: true, chat_id: parseInt(chat_id), starters });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate conversation starters', details: error.message });
  }
};

exports.checkStatus = async (req, res) => {
  try {
    const isConfigured = aiService.isConfigured();
    res.status(200).json({
      success: true,
      ai_enabled: isConfigured,
      features: isConfigured ? [
        'smart_replies',
        'translation',
        'summarization',
        'language_detection',
        'conversation_starters',
        'ai_chat',
      ] : [],
      message: isConfigured 
        ? 'AI service is configured and ready (powered by Google Gemini)'
        : 'AI service is not configured. Please add GEMINI_API_KEY to environment variables.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check AI service status', details: error.message });
  }
};

exports.aiChat = async (req, res) => {
  try {
    const { message, conversation_history = [], enable_functions = true } = req.body;
    const userId = req.user.user_id;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // If functions are disabled, use the simple chat response
    if (!enable_functions) {
      const response = await aiService.generateChatResponse(message.trim(), conversation_history);
      return res.status(200).json({
        success: true,
        response,
        timestamp: new Date().toISOString(),
      });
    }

    // Use function calling enabled chat
    const result = await aiService.generateChatResponseWithFunctions(
      message.trim(), 
      conversation_history,
      { userId }
    );

    // Check if AI wants to call a function
    if (result.requiresFunctionExecution && result.functionCall) {
      const { name, args } = result.functionCall;
      
      // Check if we have an executor for this function
      const executor = functionExecutors[name];
      if (!executor) {
        return res.status(500).json({
          error: `Unknown function: ${name}`,
        });
      }

      const functionResult = await executor(args, userId);

      // Continue chat with function result
      const finalResponse = await aiService.continueChatWithFunctionResult(
        result.functionCall,
        functionResult,
        conversation_history,
        message.trim()
      );

      return res.status(200).json({
        success: true,
        response: finalResponse,
        timestamp: new Date().toISOString(),
        functionExecuted: {
          name: name,
          args: args,
          resultSummary: {
            success: functionResult.success,
            totalResults: functionResult.totalResults || 0
          }
        }
      });
    }

    // No function call, return direct response
    res.status(200).json({
      success: true,
      response: result.response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate AI response', details: error.message });
  }
};

exports.searchMessages = async (req, res) => {
  try {
    const { query, chat_id, sender_username, start_date, end_date, limit = 20 } = req.body;
    const userId = req.user.user_id;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await executeSearchMessages({
      query: query.trim(),
      chatId: chat_id,
      senderUsername: sender_username,
      startDate: start_date,
      endDate: end_date,
      limit
    }, userId);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search messages', details: error.message });
  }
};
