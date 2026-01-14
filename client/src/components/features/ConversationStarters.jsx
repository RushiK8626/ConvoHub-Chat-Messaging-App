import React, { useState, useEffect } from "react";
import { MessageSquare, Loader, RefreshCw, X } from "lucide-react";
import { getConversationStarters } from "../../utils/api";
import "./ConversationStarters.css";

const ConversationStarters = ({
  chatId,
  onSelectStarter,
  onClose,
  disabled = false,
}) => {
  const [starters, setStarters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStarters = async () => {
    if (!chatId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getConversationStarters(chatId);
      setStarters(result.starters || []);
    } catch (err) {
      console.error("Failed to fetch conversation starters:", err);
      setError("Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStarters();
    // eslint-disable-next-line
  }, [chatId]);

  const handleSelectStarter = (starter) => {
    if (onSelectStarter && !disabled) {
      onSelectStarter(starter);
    }
  };

  if (loading && starters.length === 0) {
    return (
      <div className="conversation-starters-container">
        <div className="starters-loading">
          <Loader size={20} className="spinning" />
          <span>Loading suggestions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversation-starters-container">
        <div className="starters-error">
          <span>{error}</span>
          <button className="retry-btn" onClick={fetchStarters}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (starters.length === 0) {
    return null;
  }

  return (
    <div className="conversation-starters-container">
      <div className="starters-header">
        <div className="starters-title">
          <MessageSquare size={16} />
          <span>Start a conversation</span>
        </div>
        <div className="starters-actions">
          <button
            className="starters-refresh-btn"
            onClick={fetchStarters}
            disabled={loading}
            title="Refresh suggestions"
          >
            <RefreshCw size={16} className={loading ? "spinning" : ""} />
          </button>
          {onClose && (
            <button
              className="starters-close-btn"
              onClick={onClose}
              title="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="starters-grid">
        {starters.map((starter, index) => (
          <button
            key={index}
            className="starter-card"
            onClick={() => handleSelectStarter(starter)}
            disabled={disabled}
          >
            <MessageSquare size={18} />
            <span>{starter}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConversationStarters;
