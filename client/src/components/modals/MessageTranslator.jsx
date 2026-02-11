import React, { useState } from "react";
import { Languages, Loader, X } from "lucide-react";
import { translateText } from "../../utils/api";
import "./MessageTranslator.css";

const LANGUAGES = [
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", flag: "🇮🇳" },
  { code: "en", name: "English", flag: "🇺🇸" },
];

const MessageTranslator = ({ messageText, messageId, onClose, onTranslate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTranslate = async (targetLang) => {
    setLoading(true);
    setError(null);

    try {
      // Translate
      const result = await translateText(messageText, targetLang);
      const translated = result.translatedText || result.translated_text || "";
      
      // Call callback to apply inline translation
      if (onTranslate && messageId) {
        onTranslate(messageId, translated, targetLang);
      }
      
      onClose();
    } catch (err) {
      console.error("Translation error:", err);
      setError("Translation failed. Please try again.");
      setLoading(false);
    }
  };
  
  return (
    <div className="message-translator-overlay blurred-light" onClick={onClose}>
      <div
        className="message-translator-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="translator-header">
          <div className="translator-title">
            <Languages size={20} />
            <span>Translate to...</span>
          </div>
          <button className="translator-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="translator-content">
          {/* Original Text Preview */}
          <div className="translator-section">
            <div className="translator-section-label">Original Message</div>
            <div className="translator-text-box original">{messageText}</div>
          </div>

          {/* Language Selection */}
          <div className="translator-section">
            <div className="translator-section-label">Select Language</div>
            <div className="language-grid">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className="language-grid-option"
                  onClick={() => handleTranslate(lang.code)}
                  disabled={loading}
                >
                  <span className="language-flag">{lang.flag}</span>
                  <span className="language-name">{lang.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="translator-loading">
              <Loader size={24} className="spinning" />
              <span>Translating...</span>
            </div>
          )}

          {/* Error State */}
          {error && <div className="translator-error">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default MessageTranslator;
