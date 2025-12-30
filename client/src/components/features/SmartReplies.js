import React, { useState, useEffect } from "react";
import { Sparkles, Loader, X, RefreshCw } from "lucide-react";
import { getSmartReplies } from "../../utils/api";
import "./SmartReplies.css";

const SmartReplies = ({ chatId, onSelectReply, onClose, disabled = false }) => {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReplies = async () => {
    if (!chatId) return;

    setLoading(true);
    setError(null);

    try {
      const suggestions = await getSmartReplies(chatId, 3);
      setReplies(suggestions);
    } catch (err) {
      console.error("Failed to fetch smart replies:", err);
      setError("Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch replies when component mounts or chat changes
    fetchReplies();
    // eslint-disable-next-line
  }, [chatId]);

  const handleSelectReply = (reply) => {
    if (onSelectReply && !disabled) {
      onSelectReply(reply);
    }
  };

  const handleRefresh = (e) => {
    e.stopPropagation();
    fetchReplies();
  };

  return (
    <div
      className="smart-replies-container"
      style={{
        background: "var(--card-background)",
        color: "var(--text-color)",
      }}
    >
      <div className="smart-replies-header">
        <div className="smart-replies-title">
          <Sparkles size={16} />
          <span>Smart Replies</span>
        </div>
        <div className="smart-replies-actions">
          <button
            className="smart-replies-action-btn"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh suggestions"
          >
            <RefreshCw size={16} className={loading ? "spinning" : ""} />
          </button>
          <button
            className="smart-replies-action-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="smart-replies-loading">
          <Loader size={20} className="spinning" />
          <span>Generating suggestions...</span>
        </div>
      )}

      {error && (
        <div className="smart-replies-error">
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && replies.length > 0 && (
        <div className="smart-replies-list">
          {replies.map((reply, index) => (
            <button
              key={index}
              className="smart-reply-chip"
              onClick={() => handleSelectReply(reply)}
              disabled={disabled}
              style={{
                background: "var(--input-background)",
                color: "var(--text-color)",
                borderColor: "var(--border-color)",
              }}
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {!loading && !error && replies.length === 0 && (
        <div className="smart-replies-empty">No suggestions available</div>
      )}
    </div>
  );
};

export default SmartReplies;
