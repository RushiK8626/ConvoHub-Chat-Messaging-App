import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Sparkles, Copy, Edit, Trash2, Redo2, Languages, TextInitial } from 'lucide-react';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendAIMessage, AI_ASSISTANT } from '../utils/aiChatService';
import { formatMessageTime } from '../utils/dateUtils';
import useResponsive from '../hooks/useResponsive';
import useContextMenu from "../hooks/useContextMenu";
import ContextMenu from "../components/ContextMenu";
import { translateText } from "../utils/aiClient";
import MessageTranslator from "../components/MessageTranslator";
import { useToast } from "../hooks/useToast"; 
import './ChatWindow.css';
import './AIChatWindow.css';

const AIChatWindow = ({ onClose, isEmbedded = false }) => {
  const navigate = useNavigate();
  const isWideScreen = useResponsive();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [error, setError] = useState("");

  const [messageEditing, setMessageEditing] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessage, setEditingMessage] = useState('');

  const messageContextMenu = useContextMenu();
  const [selectedMessage, setSelectedMessage] = useState(null);

  const { toasts, showError, showSuccess, removeToast } = useToast();

  const [showTranslator, setShowTranslator] = useState(false);
  const [translateMessage, setTranslateMessage] = useState(null);
  const [messageTranslations, setMessageTranslations] = useState({});

  // Load messages from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing AI chat history:', e);
      }
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai_chat_history', JSON.stringify(messages.slice(-100)));
    }
    console.log(JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendAIMessage(userMessage.content, conversationHistory);

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.response,
        timestamp: response.timestamp || new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again. ' + (error.message || ''),
        timestamp: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (id) => {
    // Find the index of the message being edited
    const messageIndex = messages.findIndex(m => m.id === id);
    if (messageIndex === -1) return;

    // Create a new history: Keep everything BEFORE the edited message, 
    // then add the newly edited message.
    const updatedHistory = messages.slice(0, messageIndex);
    const editedMessage = {
      ...messages[messageIndex],
      content: inputText.trim(),
      timestamp: new Date().toISOString()
    };

    const finalMessages = [...updatedHistory, editedMessage];
    setMessages(finalMessages);

    // Update state and reset UI
    setEditingMessage(null);
    setEditingMessageId(null);
    setMessageEditing(false);
    setInputText('');
    setLoading(true);


    try {
      // Include all messages up to and including the edited message as conversation history
      const apiHistory = finalMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
      const response = await sendAIMessage(editedMessage.content, apiHistory);

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
      };

      // Update messages with both edited message and new AI response
      setMessages([...finalMessages, aiMessage]);
    } catch (error) {
      console.error(error);
      // Revert to edited message state on error
      setMessages(finalMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = () => {
    if (selectedMessage?.content) {
      navigator.clipboard.writeText(selectedMessage.content)
        .then(() => {
          messageContextMenu.closeMenu();
        })
        .catch((err) => {
          messageContextMenu.closeMenu();
        });
    }
  };

  const handleEditMessage = () => {
    if (selectedMessage?.role === 'user' && selectedMessage?.content) {
      setMessageEditing(true);
      setEditingMessage(selectedMessage.content);
      setInputText(selectedMessage.content);
      setEditingMessageId(selectedMessage.id);
      messageContextMenu.closeMenu();
    }
  };

  const handleRegenerateMessage = () => {
    if (selectedMessage?.role === 'assistant' && selectedMessage?.id) {
      messageContextMenu.closeMenu();
      // Find the index and remove all messages from this point onward
      const messageIndex = messages.findIndex(m => m.id === selectedMessage.id);
      if (messageIndex !== -1) {
        const updatedMessages = messages.slice(0, messageIndex);
        setMessages(updatedMessages);
        setLoading(true);

        // Get the previous user message to regenerate from
        const userMessage = updatedMessages[updatedMessages.length - 1];
        if (userMessage?.role === 'user') {
          const conversationHistory = updatedMessages.slice(0, -1).map(m => ({
            role: m.role,
            content: m.content,
          }));

          sendAIMessage(userMessage.content, conversationHistory)
            .then((response) => {
              const aiMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: response.response,
                timestamp: new Date().toISOString(),
              };
              setMessages(prev => [...prev, aiMessage]);
            })
            .catch((error) => {
              console.error('Regenerate error:', error);
              setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: 'Failed to regenerate response. Please try again.',
                timestamp: new Date().toISOString(),
                isError: true,
              }]);
            })
            .finally(() => setLoading(false));
        }
      }
    }
  };

  // Get default translation language from settings
  const getDefaultTranslationLanguage = () => {
    return localStorage.getItem("defaultTranslationLanguage") || "en";
  };

  // Handle inline translation of a message
  const handleTranslateMessage = async (message, targetLanguage) => {
    if (!message?.content) return;

    const messageId = message.id;

    // Set loading state
    setMessageTranslations(prev => ({
      ...prev,
      [messageId]: { text: '', lang: targetLanguage, loading: true }
    }));

    try {
      const result = await translateText(message.content, targetLanguage);
      const translatedText = result.translatedText || result.translated_text || '';

      setMessageTranslations(prev => ({
        ...prev,
        [messageId]: { text: translatedText, lang: targetLanguage, loading: false }
      }));
    } catch (error) {
      console.error('Translation error:', error);
      showError('Translation failed. Please try again.');
      // Remove the translation entry on error
      setMessageTranslations(prev => {
        const newTranslations = { ...prev };
        delete newTranslations[messageId];
        return newTranslations;
      });
    }
  };

  // Clear translation for a message (show original)
  const handleShowOriginal = (messageId) => {
    setMessageTranslations(prev => {
      const newTranslations = { ...prev };
      delete newTranslations[messageId];
      return newTranslations;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageEditing) {
        handleEditSubmit(editingMessageId);
      } else {
        handleSend();
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('ai_chat_history');
  };

  const handleBack = () => {
    if (isEmbedded && onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const getMessageContextMenuItems = (message) => {
    const isPrompt = message?.role === 'user';
    const defaultLang = getDefaultTranslationLanguage();

    const items = [
      {
        id: "copy",
        label: "Copy",
        icon: <Copy size={16} />,
        onClick: handleCopyMessage,
      },
    ];

    if (isPrompt) {
      items.push({
        id: "edit",
        label: "Edit",
        icon: <Edit size={16} />,
        onClick: handleEditMessage,
        disabled: !message?.content,
      });
    }
    else {
      items.push({
        id: "regernate",
        label: "Regenerate",
        icon: <Redo2 size={16} />,
        onClick: handleRegenerateMessage,
        disabled: !message?.content,
      });

      items.push({
        id: "translate-default",
        label: "Translate",
        icon: <Languages size={16} />,
        onClick: () => {
          handleTranslateMessage(message, defaultLang);
          messageContextMenu.closeMenu();
        },
        disabled: !message?.content,
      });

      items.push({
        id: "translate-to",
        label: "Translate to...",
        icon: <Languages size={16} />,
        onClick: () => {
          setTranslateMessage(message);
          setShowTranslator(true);
          messageContextMenu.closeMenu();
        },
        disabled: !message?.content,
      });
    }
    return items;
  };

  const handleMessageContextMenu = (e, message) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedMessage(message);

    const menuWidth = 280;
    const menuHeight = 300;
    let x = e.clientX;
    let y = e.clientY;

    // Prevent right-side overflow
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 16;
    }
    // Prevent bottom overflow
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 16;
    }

    messageContextMenu.setMenu({ isOpen: true, x, y });
  };

  return (
    <div className={`chat-window ai-chat-window ${isEmbedded ? 'embedded' : ''}`}>
      {/* Header */}
      <div className="chat-window-header ai-header">
        {!isEmbedded && (
          <button className="back-btn" onClick={handleBack}>
            <ArrowLeft size={24} />
          </button>
        )}
        <div className="header-info">
          <div className="chat-avatar-small ai-chat-avatar">
            <Sparkles size={24} />
          </div>
          <div className="header-text">
            <h2>{AI_ASSISTANT.name}</h2>
            <span className="status-text">Always available</span>
          </div>
        </div>
        <button
          className="clear-chat-btn"
          onClick={clearChat}
          title="Clear chat history"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Messages */}
      <SimpleBar className="messages-container">
        {messages.length === 0 && (
          <div className="ai-welcome">
            <div className="ai-welcome-icon">
              <Sparkles size={48} />
            </div>
            <h3>Hi! I'm your AI Assistant</h3>
            <p>Ask me anything - I can help with questions, coding, writing, and more!</p>
            <div className="ai-suggestions">
              <button onClick={() => setInputText("What can you help me with?")}>
                What can you help me with?
              </button>
              <button onClick={() => setInputText("Tell me a fun fact")}>
                Tell me a fun fact
              </button>
              <button onClick={() => setInputText("Help me write a message")}>
                Help me write a message
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const hasTranslation = messageTranslations[msg?.id];
          const showTranslated = hasTranslation && !hasTranslation.loading;
          const displayText = showTranslated ? hasTranslation.text : msg.content;
          
          return (
            <div
              key={msg.id}
              className={`message ${msg.role === 'user' ? 'message-sent' : 'message-received'} ${msg.isError ? 'error' : ''}`}

              onContextMenu={(e) => {
                handleMessageContextMenu(e, msg);
              }}
              onTouchStart={() => setSelectedMessage(msg)}
              onTouchEnd={(e) => messageContextMenu.handleLongPress(e, 500)}
            >
              {msg.role === 'assistant' && (
                <div className="ai-msg-avatar">
                  <Sparkles size={16} />
                </div>
              )}

              <div className="message-bubble">
                {/* Loading indicator */}
                {hasTranslation?.loading && (
                  <div className="translation-loading">
                    <span>Translating...</span>
                  </div>
                )}

                {/* Message text (original or translated) */}
                <div className="message-text">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {displayText}
                    </ReactMarkdown>
                  ) : (
                    displayText
                  )}
                </div>

                {/* Translation info and toggle button */}
                {hasTranslation && !hasTranslation.loading && (
                  <div className="translation-info">
                    <span className="translation-badge">
                      <Languages size={12} />
                      Translated to {hasTranslation.lang.toUpperCase()}
                    </span>
                    <button
                      className="see-original-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowOriginal(msg.id);
                      }}
                      title="Show original message"
                    >
                      See original
                    </button>
                  </div>
                )}

                <div className="message-meta">
                  <span className="message-time">
                    {formatMessageTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="message message-received">
            <div className="ai-msg-avatar">
              <Sparkles size={16} />
            </div>
            <div className="message-bubble typing-bubble">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </SimpleBar>

      <ContextMenu
        isOpen={messageContextMenu.isOpen}
        x={messageContextMenu.x}
        y={messageContextMenu.y}
        items={getMessageContextMenuItems(selectedMessage)}
        onClose={messageContextMenu.closeMenu}
      />

      {/* Input */}
      <div className={`message-input-container ${messageEditing ? 'editing-mode' : ''}`}>

        {/* Edit Mode Indicator */}
        {messageEditing && (
          <div className="edit-indicator">
            <div className="edit-label">
              <Edit size={16} className="edit-icon" />
              <span>Editing message</span>
            </div>
            <button className="cancel-edit" onClick={() => {
              setMessageEditing(false);
              setEditingMessageId(null);
              setEditingMessage('');
              setInputText('');
            }} title="Cancel editing">
              ✕
            </button>
          </div>
        )}

        <div className="message-input-wrapper">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={"Message AI Assistant..."}
            rows={1}
            disabled={loading}
          />
          <button
            className={`send-button ${(inputText.trim() && !loading) ? 'active' : ''}`}
            onClick={messageEditing ? () => handleEditSubmit(editingMessageId) : handleSend}
            disabled={!inputText.trim() || loading || inputText == editingMessage}
          >
            {messageEditing ? <Sparkles size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>

      {showTranslator && translateMessage && (
        <MessageTranslator
          messageText={translateMessage.content}
          messageId={translateMessage.id}
          onClose={() => {
            setShowTranslator(false);
            setTranslateMessage(null);
          }}
          onTranslate={(msgId, translatedText, lang) => {
            setMessageTranslations(prev => ({
              ...prev,
              [msgId]: { text: translatedText, lang: lang, loading: false }
            }));
          }}
        />
      )}

    </div>
  );
};

export default AIChatWindow;