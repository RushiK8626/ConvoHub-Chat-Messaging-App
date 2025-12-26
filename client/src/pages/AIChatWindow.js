import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Sparkles, Loader, Trash2 } from 'lucide-react';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendAIMessage, AI_ASSISTANT } from '../utils/aiChatService';
import { formatMessageTime } from '../utils/dateUtils';
import useResponsive from '../hooks/useResponsive';
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`message ${msg.role === 'user' ? 'message-sent' : 'message-received'} ${msg.isError ? 'error' : ''}`}
          >
            {msg.role === 'assistant' && (
              <div className="ai-msg-avatar">
                <Sparkles size={16} />
              </div>
            )}
            <div className="message-bubble">
              <div className="message-text">
                {msg.role === 'assistant' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
              <div className="message-meta">
                <span className="message-time">
                  {formatMessageTime(msg.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
        
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

      {/* Input */}
      <div className="message-input-container">
        <div className="message-input-wrapper">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message AI Assistant..."
            rows={1}
            disabled={loading}
          />
          <button 
            className={`send-button ${inputText.trim() && !loading ? 'active' : ''}`}
            onClick={handleSend}
            disabled={!inputText.trim() || loading}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatWindow;