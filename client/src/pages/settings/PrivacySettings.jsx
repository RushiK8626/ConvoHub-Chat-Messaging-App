import React, { useEffect, useState } from "react";
import "./PrivacySettings.css";
import PageHeader from "../../components/common/PageHeader";
import { useNavigate } from "react-router-dom";
import useResponsive from "../../hooks/useResponsive";

const PrivacySettings = ({ isEmbedded = false }) => {
    const navigate = useNavigate();
    const isWideScreen = useResponsive();
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isEmbedded && isWideScreen) {
            navigate("/settings", { state: { selectedSettingId: "privacy" } });
        }
    }, [isWideScreen, isEmbedded, navigate]);

    const [convohubAssistantEnabled, SeConvohubAssistantEnabled] = useState(() => {
        const stored = localStorage.getItem('convhub_assistant');
        return stored === null ? true : stored === 'true';
    });

    const handleAIAssistantToggle = async (e) => {
        setError(null);
        const newValue = !convohubAssistantEnabled;
        localStorage.setItem('convhub_assistant', newValue);
        SeConvohubAssistantEnabled(newValue);
        window.dispatchEvent(new Event('convhub_assistant_changed'));
    };

    return (
        <div className="privacy-settings">
            <PageHeader
                title="Privacy"
                onBack={() => {
                    if (isEmbedded) {
                        navigate(-1);
                    } else {
                        navigate("/settings");
                    }
                }}
            />
            <div className="settings-section">
                <div className="setting-item">
                    <h2 className="section-title">SwiftTalk AI Assistant</h2>
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
