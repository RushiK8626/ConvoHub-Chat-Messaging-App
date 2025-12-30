import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Languages } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import useResponsive from "../../hooks/useResponsive";
import "./Language.css";

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

const Language = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const isWideScreen = useResponsive();
  const [defaultTranslationLanguage, setDefaultTranslationLanguage] = useState(() => {
    return localStorage.getItem("defaultTranslationLanguage") || "en";
  });

  // Handle responsive layout changes - navigate to settings page when screen becomes wide
  useEffect(() => {
    if (!isEmbedded && isWideScreen) {
      navigate("/settings", { state: { selectedSettingId: "language" } });
    }
  }, [isWideScreen, isEmbedded, navigate]);

  // Save to localStorage whenever language changes
  const handleLanguageSelect = (langCode) => {
    setDefaultTranslationLanguage(langCode);
    localStorage.setItem("defaultTranslationLanguage", langCode);
  };

  const getLanguageName = (code) => {
    const lang = LANGUAGES.find((l) => l.code === code);
    return lang ? `${lang.flag} ${lang.name}` : code;
  };

  return (
    <div className="language-page">
      {!isEmbedded && (
        <PageHeader title="Language" onBack={() => navigate("/settings")} />
      )}
      {isEmbedded && (
        <div className="embedded-header">
          <Languages size={24} />
          <h1>Language Settings</h1>
        </div>
      )}

      <div className="language-content">
        <div className="language-section">
          <h2 className="section-title">Default Translation Language</h2>
          <p className="section-description">
            Choose the language you want messages to be translated to by default. 
            You can use "Translate (Default)" in the message context menu to quickly 
            translate messages to this language.
          </p>

          <div className="language-options">
            {LANGUAGES.map((lang) => {
              const isSelected = defaultTranslationLanguage === lang.code;

              return (
                <button
                  key={lang.code}
                  className={`language-option ${isSelected ? "selected" : ""}`}
                  onClick={() => handleLanguageSelect(lang.code)}
                >
                  <div className="language-option-flag">
                    <span>{lang.flag}</span>
                  </div>
                  <div className="language-option-info">
                    <h3>{lang.name}</h3>
                    <p>{lang.code.toUpperCase()}</p>
                  </div>
                  {isSelected && (
                    <div className="language-option-check">
                      <Check size={20} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="language-info">
          <div className="info-card">
            <h3>How to translate messages</h3>
            <ul>
              <li>
                <strong>Translate (Default):</strong> Right-click on any message and select 
                "Translate (Default)" to translate it to your default language.
              </li>
              <li>
                <strong>Translate to...:</strong> Right-click on any message and select 
                "Translate to..." to choose a specific language.
              </li>
              <li>
                <strong>Show Original:</strong> Click "Show Original" on a translated 
                message to see the original text.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Language;
