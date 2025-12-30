import React, { useEffect, useState } from "react";
import { useNotifications } from "../hooks/useNotifications";
import "./PrivacySettings.css";
import PageHeader from "../components/PageHeader";
import { useNavigate, useLocation } from "react-router-dom";
import useResponsive from "../hooks/useResponsive";

const PrivacySettings = ({ isEmbedded = false }) => {
    const navigate = useNavigate();
    const isWideScreen = useResponsive();
    const [error, setError] = useState(null);

    // Handle responsive layout changes - navigate to settings page when screen becomes wide
    useEffect(() => {
        if (!isEmbedded && isWideScreen) {
            navigate("/settings", { state: { selectedSettingId: "privacy" } });
        }
    }, [isWideScreen, isEmbedded, navigate]);

    // Get userId and token from localStorage for this page
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user?.id || user?.user_id; // Try 'id' first, fall back to 'user_id'
    const token = localStorage.getItem("accessToken");

    const [convohubAssistantEnabled, SeConvohubAssistantEnabled] = useState(() => {
        const stored = localStorage.getItem('convhub_assistant');
        return stored === null ? true : stored === 'true';
    });

    // Handle toggle with better error feedback
    const handleAIAssistantToggle = async (e) => {
        setError(null);
        const newValue = !convohubAssistantEnabled;
        localStorage.setItem('convhub_assistant', newValue);
        SeConvohubAssistantEnabled(newValue);
        // Dispatch custom event so other components can react
        window.dispatchEvent(new Event('convhub_assistant_changed'));
    };

    return (
        <div className="privacy-settings">
            <PageHeader
                title="Privacy"
                onBack={() => {
                    if (isEmbedded) {
                        navigate(-1); // Go back to previous page in split layout
                    } else {
                        navigate("/settings");
                    }
                }}
            />
            <div className="settings-section">
                <div className="setting-item">
                    <h2 className="section-title">Convohub AI Assistant</h2>
                    <div className="privacy-toggle">
                        <div className="toggle-label">
                            <span className="toggle-status">
                                {convohubAssistantEnabled ? "Enabled" : "Disabled"}
                            </span>
                            <span className="toggle-description">
                                {convohubAssistantEnabled
                                    ? "AI Assistant is visible in your chat list"
                                    : "AI Assistant is hidden from your chat list"}
                            </span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={convohubAssistantEnabled}
                                onChange={handleAIAssistantToggle}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                    {error && <div className="error-message">{error}</div>}
                </div>
            </div>
        </div>
    );
};

export default PrivacySettings;
