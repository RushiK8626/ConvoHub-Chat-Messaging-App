import React, { useState } from "react";
import {
  FileText,
  Loader,
  X,
  List,
  AlignLeft,
  CheckSquare,
} from "lucide-react";
import { summarizeChat } from "../../utils/api";
import "./ChatSummary.css";

const SUMMARY_TYPES = [
  {
    value: "brief",
    label: "Brief",
    icon: AlignLeft,
    description: "Quick overview",
  },
  {
    value: "detailed",
    label: "Detailed",
    icon: FileText,
    description: "In-depth summary",
  },
  {
    value: "bullet",
    label: "Bullet Points",
    icon: List,
    description: "Key points",
  },
];

const ChatSummary = ({ chatId, onClose }) => {
  const [summary, setSummary] = useState("");
  const [summaryType, setSummaryType] = useState("brief");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateSummary = async (type) => {
    setLoading(true);
    setError(null);
    setSummaryType(type);

    try {
      const result = await summarizeChat(chatId, type);
      setSummary(result.summary || "");
    } catch (err) {
      console.error("Summary generation error:", err);
      setError("Failed to generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-summary-overlay blurred-light" onClick={onClose}>
      <div
        className="chat-summary-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="summary-header">
          <div className="summary-title">
            <FileText size={20} />
            <span>Chat Summary</span>
          </div>
          <button className="summary-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="summary-content">
          {/* Summary Type Selector */}
          <div className="summary-type-selector">
            {SUMMARY_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  className={`summary-type-btn ${
                    summaryType === type.value ? "active" : ""
                  }`}
                  onClick={() => handleGenerateSummary(type.value)}
                  disabled={loading}
                >
                  <Icon size={18} />
                  <div className="summary-type-info">
                    <span className="summary-type-label">{type.label}</span>
                    <span className="summary-type-desc">
                      {type.description}
                    </span>
                  </div>
                  {summaryType === type.value && !loading && summary && (
                    <CheckSquare size={18} className="check-icon" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="summary-loading">
              <Loader size={32} className="spinning" />
              <span>Generating {summaryType} summary...</span>
            </div>
          )}

          {/* Error State */}
          {error && <div className="summary-error">{error}</div>}

          {/* Summary Display */}
          {!loading && !error && summary && (
            <div className="summary-result">
              <div className="summary-result-header">
                <FileText size={16} />
                <span>
                  {SUMMARY_TYPES.find((t) => t.value === summaryType)?.label}{" "}
                  Summary
                </span>
              </div>
              <div className="summary-text">{summary}</div>
            </div>
          )}

          {/* Initial State */}
          {!loading && !error && !summary && (
            <div className="summary-placeholder">
              <FileText size={48} />
              <p>Select a summary type above to generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSummary;
