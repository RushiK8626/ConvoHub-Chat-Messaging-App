import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Moon, Check } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { useTheme } from "../../context/ThemeContext";
import useResponsive from "../../hooks/useResponsive";
import "./Appearance.css";

const ACCENT_COLORS = [
  { id: "blue", label: "Blue", value: "#007AFF" },
  { id: "red", label: "Red", value: "#FF3B30" },
  { id: "orange", label: "Orange", value: "#FF9500" },
  { id: "green", label: "Green", value: "#34C759" },
  { id: "purple", label: "Purple", value: "#AF52DE" },
];

const Appearance = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const isWideScreen = useResponsive();
  const { theme, setLightTheme, setDarkTheme, accent, setAccent } = useTheme();

  // Handle responsive layout changes - navigate to settings page when screen becomes wide
  useEffect(() => {
    if (!isEmbedded && isWideScreen) {
      navigate("/settings", { state: { selectedSettingId: "appearance" } });
    }
  }, [isWideScreen, isEmbedded, navigate]);

  const themeOptions = [
    {
      id: "light",
      label: "Light Mode",
      description: "Clean and bright interface",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark Mode",
      description: "Pitch black theme for your eyes",
      icon: Moon,
    },
  ];

  const handleThemeSelect = (themeId) => {
    if (themeId === "light") {
      setLightTheme();
    } else {
      setDarkTheme();
    }
  };

  const handleAccentSelect = (accentId) => {
    setAccent(accentId);
  };

  return (
    <div className="appearance-page">
      {!isEmbedded && (
        <PageHeader title="Appearance" onBack={() => navigate("/settings")} />
      )}

      <div className="appearance-content">
        <div className="appearance-section">
          <h2 className="section-title">Theme</h2>
          <p className="section-description">
            Choose how ConvoHub looks to you. Select a single theme, or sync
            with your system.
          </p>

          <div className="theme-options">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.id;

              return (
                <button
                  key={option.id}
                  className={`theme-option ${isSelected ? "selected" : ""}`}
                  onClick={() => handleThemeSelect(option.id)}
                >
                  <div className="theme-option-icon">
                    <Icon size={24} />
                  </div>
                  <div className="theme-option-info">
                    <h3>{option.label}</h3>
                    <p>{option.description}</p>
                  </div>
                  {isSelected && (
                    <div className="theme-option-check">
                      <Check size={20} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="appearance-section">
          <h2 className="section-title">Accent Color</h2>
          <p className="section-description">
            Choose your accent color for highlights and buttons.
          </p>
          <div className="theme-options">
            {ACCENT_COLORS.map((option) => (
              <button
                key={option.id}
                className={`theme-option ${
                  accent === option.id ? "selected" : ""
                }`}
                style={{
                  borderColor: accent === option.id ? option.value : undefined,
                }}
                onClick={() => handleAccentSelect(option.id)}
              >
                <div
                  className="theme-option-icon"
                  style={{ background: option.value }}
                />
                <div className="theme-option-info">
                  <h3>{option.label}</h3>
                </div>
                {accent === option.id && (
                  <div className="theme-option-check">
                    <Check size={20} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="appearance-preview">
          <h3 className="preview-title">Preview</h3>
          <div className="preview-window">
            <div className="preview-header">
              <div className="preview-avatar"></div>
              <div className="preview-text">
                <div className="preview-name"></div>
                <div className="preview-status"></div>
              </div>
            </div>
            <div className="preview-messages">
              <div className="preview-message received">
                <div className="preview-bubble">Hey there!</div>
              </div>
              <div className="preview-message sent">
                <div className="preview-bubble">Hello! How are you?</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appearance;
