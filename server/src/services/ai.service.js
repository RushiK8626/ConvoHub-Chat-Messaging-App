const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuration
const AI_CONFIG = {
  model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 150,
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE) || 0.7,
};

const functionDeclarations = [
  {
    name: "searchMessages",
    description: "Search for messages in the user's chats. Use this when user asks to find, search, or look for specific messages, conversations, or content. Returns matching messages with sender info and timestamps.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "The search query/keywords to look for in messages"
        },
        chatId: {
          type: "NUMBER",
          description: "Optional: Specific chat ID to search in. If not provided, searches all user's chats"
        },
        senderUsername: {
          type: "STRING",
          description: "Optional: Filter messages by sender's username"
        },
        startDate: {
          type: "STRING",
          description: "Optional: Start date for search range (ISO format, e.g., '2024-01-01')"
        },
        endDate: {
          type: "STRING",
          description: "Optional: End date for search range (ISO format, e.g., '2024-12-31')"
        },
        limit: {
          type: "NUMBER",
          description: "Maximum number of results to return (default: 10, max: 50)"
        }
      },
      required: ["query"]
    }
  }
];

const generateSmartReplies = async (messageHistory, count = 3) => {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('Gemini API key not configured');
    if (!messageHistory || messageHistory.length === 0) throw new Error('Message history is required');

    // Format message history for context
    const conversationContext = messageHistory
      .slice(-10) // Only use last 10 messages for context
      .map(msg => `${msg.sender}: ${msg.text}`)
      .join('\n');

    const lastMessage = messageHistory[messageHistory.length - 1];

    const prompt = `You are helping generate quick reply suggestions for a chat application. 
Based on the following conversation, suggest ${count} brief, natural, and contextually appropriate responses.
Each reply should be concise (1-2 sentences max) and sound conversational.

Conversation:
${conversationContext}

Generate ${count} different reply suggestions that would make sense as responses to the last message from ${lastMessage.sender}.
Return ONLY the suggestions, one per line, without numbering or formatting. You can use suitable emoji in message`;

    const model = genAI.getGenerativeModel({ 
      model: AI_CONFIG.model,
      generationConfig: {
        maxOutputTokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const suggestions = text
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .slice(0, count);

    return suggestions;
  } catch (error) {
    throw error;
  }
};

const translateMessage = async (text, targetLanguage, sourceLanguage = 'auto') => {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('Gemini API key not configured');
    if (!text || !text.trim()) throw new Error('Text to translate is required');
    if (!targetLanguage) throw new Error('Target language is required');

    // Language name mapping for better prompts
    const languageNames = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'hi': 'Hindi',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'it': 'Italian',
      'mr': 'Marathi',
    };

    const targetLangName = languageNames[targetLanguage.toLowerCase()] || targetLanguage;

    const prompt = sourceLanguage === 'auto' 
      ? `Translate the following text to ${targetLangName}. Only return the translation, nothing else:\n\n${text}`
      : `Translate the following text from ${languageNames[sourceLanguage] || sourceLanguage} to ${targetLangName}. Only return the translation, nothing else:\n\n${text}`;

    const model = genAI.getGenerativeModel({ 
      model: AI_CONFIG.model,
      generationConfig: {
        maxOutputTokens: Math.max(AI_CONFIG.maxTokens, text.length * 2),
        temperature: 0.3, // Lower temperature for more consistent translations
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text().trim();

    return {
      translatedText,
      sourceLanguage,
      targetLanguage,
    };
  } catch (error) {
    throw error;
  }
};

const summarizeConversation = async (messages, summaryType = 'brief') => {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('Gemini API key not configured');
    if (!messages || messages.length === 0) throw new Error('Messages to summarize are required');

    // Format messages for summarization
    const conversationText = messages
      .map(msg => {
        const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '';
        return `[${timestamp}] ${msg.sender}: ${msg.text}`;
      })
      .join('\n');

    const summaryInstructions = {
      brief: 'Provide a brief 1-2 sentence summary of the main points discussed.',
      detailed: 'Provide a detailed paragraph summarizing the conversation, including key points, decisions, and important details.',
      bullet: 'Provide a bullet-point summary of the main topics and key points discussed.',
    };

    const instruction = summaryInstructions[summaryType] || summaryInstructions.brief;

    const prompt = `Summarize the following conversation. ${instruction}

Conversation:
${conversationText}

Summary:`;

    const model = genAI.getGenerativeModel({ 
      model: AI_CONFIG.model,
      generationConfig: {
        maxOutputTokens: summaryType === 'detailed' ? 300 : AI_CONFIG.maxTokens,
        temperature: 0.5,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text().trim();

    return summary;
  } catch (error) {
    throw error;
  }
};

const detectLanguage = async (text) => {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('Gemini API key not configured');
    if (!text || !text.trim()) throw new Error('Text is required for language detection');

    const prompt = `Detect the language of the following text and respond with ONLY the ISO 639-1 language code (e.g., en, es, fr, de, hi, zh):\n\n${text}`;

    const model = genAI.getGenerativeModel({ 
      model: AI_CONFIG.model,
      generationConfig: {
        maxOutputTokens: 10,
        temperature: 0.1,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const languageCode = response.text().trim().toLowerCase();

    return {
      languageCode,
      text: text.substring(0, 100),
    };
  } catch (error) {
    throw error;
  }
};

const generateConversationStarters = async (context) => {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('Gemini API key not configured');

    const { chatType, chatName, recipientName } = context;
    
    let prompt;

    // Shared instruction to ensure clean output
    const strictOutputRules = "IMPORTANT: Output ONLY the 3 specific message options. Do not include numbering (1., 2., 3.), bullet points, greetings to me, or phrases like 'Here are the starters'. Just return the 3 lines of text. You can use emoji in the messages.";

    if (chatType === 'group') {
      prompt = `Generate 3 short friendly icebreakers to start a conversation in a new $ chat named "${chatName}". The tone should be welcoming and encourage members to start talking for the first time. ${strictOutputRules}`;
    } else {
      prompt = `Generate 3 short friendly conversation starters for a direct message with a new connection named ${recipientName || 'a new friend'}. The context is saying hello for the very first time, so make them engaging but polite. ${strictOutputRules}`;
    }

    const model = genAI.getGenerativeModel({ 
      model: AI_CONFIG.model,
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.8,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const starters = text
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim()) // Remove numbering
      .slice(0, 3);

    return starters;
  } catch (error) {
    throw error;
  }
};

const isConfigured = () => !!process.env.GEMINI_API_KEY;

const generateChatResponse = async (userMessage, conversationHistory = []) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const model = genAI.getGenerativeModel({ 
      model: AI_CONFIG.model,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.8,
      },
    });

    // Build conversation context from history
    const historyText = conversationHistory
      .slice(-20) // Last 20 messages for context
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const prompt = `You are a helpful, friendly AI assistant in a chat application called ConvoHub. 
Be conversational, helpful, and concise in your responses. You can use emojis when appropriate to make the conversation feel natural.
If asked about yourself, mention you're an ConvoHub AI assistant, here to help users.
If asked who developed you, mention about ConvoHub Developers.
Keep responses focused and avoid being overly verbose unless the user asks for detailed explanations.

IMPORTANT: Format your responses using Markdown for better readability:
- Use **bold** for emphasis on important points
- Use *italic* for subtle emphasis
- Use \`code\` for inline code and \`\`\` for code blocks with language specification
- Use bullet points (- or *) for lists
- Use numbered lists (1. 2. 3.) when order matters
- Use > for blockquotes
- Use ### for section headers when organizing longer responses

${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}User: ${userMessage}

Respond naturally as a helpful assistant using Markdown formatting:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    throw error;
  }
};

const generateChatResponseWithFunctions = async (userMessage, conversationHistory = [], context = {}) => {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('Gemini API key not configured');

    // Initialize model with function calling capability
    const model = genAI.getGenerativeModel({ 
      model: AI_CONFIG.model,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
      tools: [{ functionDeclarations }],
    });

    // Build conversation history for Gemini chat format
    const chatHistory = conversationHistory.slice(-20).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // System instruction text
    const systemInstructionText = `You are a helpful, friendly AI assistant in a chat application called ConvoHub.
You have access to functions that can help users interact with the app.

AVAILABLE FUNCTIONS:
1. searchMessages - Search for messages in user's chats. Use this when user asks to find, search, or look for messages.

WHEN TO USE FUNCTIONS:
- User says "find messages about...", "search for...", "look for messages...", "what did X say about..."
- User wants to locate specific conversations or content
- User asks about past messages or discussions

Be conversational and helpful. Use emojis when appropriate. 
Format responses using Markdown for readability.
When you use a function, explain what you're doing to the user.`;

    // Start chat with history
    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: {
        role: "user",
        parts: [{ text: systemInstructionText }]
      }
    });

    // Send message and check for function call
    const result = await chat.sendMessage(userMessage);
    const response = result.response;

    // Check if Gemini wants to call a function
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      const functionCall = functionCalls[0]; // Handle first function call
      return {
        response: null,
        functionCall: {
          name: functionCall.name,
          args: functionCall.args
        },
        requiresFunctionExecution: true
      };
    }

    // No function call, return text response
    return {
      response: response.text().trim(),
      functionCall: null,
      requiresFunctionExecution: false
    };

  } catch (error) {
    throw error;
  }
};

const continueChatWithFunctionResult = async (functionCall, functionResult, conversationHistory = [], originalMessage) => {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('Gemini API key not configured');

    const model = genAI.getGenerativeModel({ 
      model: AI_CONFIG.model,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
      tools: [{ functionDeclarations }],
    });

    // Build conversation history
    const chatHistory = conversationHistory.slice(-20).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const systemInstructionText = `You are a helpful AI assistant in ConvoHub chat app.
You just executed a function and received results. Present the results in a helpful, readable format.
Use Markdown formatting. Be concise but informative.
If no results found, be helpful and suggest alternatives.`;

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: {
        role: "user",
        parts: [{ text: systemInstructionText }]
      }
    });

    // Send the original message
    await chat.sendMessage(originalMessage);

    // Send function result back to the model
    const result = await chat.sendMessage([
      {
        functionResponse: {
          name: functionCall.name,
          response: functionResult
        }
      }
    ]);

    return result.response.text().trim();

  } catch (error) {
    throw error;
  }
};

const getFunctionDeclarations = () => functionDeclarations;

module.exports = {
  generateSmartReplies,
  translateMessage,
  summarizeConversation,
  detectLanguage,
  generateConversationStarters,
  isConfigured,
  generateChatResponse,
  generateChatResponseWithFunctions,
  continueChatWithFunctionResult,
  getFunctionDeclarations,
};
