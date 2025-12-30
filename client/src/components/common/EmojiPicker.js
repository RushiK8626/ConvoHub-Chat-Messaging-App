import React, { useState, useEffect } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useTheme } from "../../context/ThemeContext";
import "./EmojiPicker.css";

export default function EmojiPicker({ onSelect }) {
  const { theme, accent } = useTheme();

  // Convert hex accent color to RGB for emoji picker
  const getAccentRGB = () => {
    const ACCENT_COLOR_MAP = {
      blue: "0, 122, 255",
      red: "255, 59, 48",
      orange: "255, 149, 0",
      green: "52, 199, 89",
      purple: "175, 82, 222",
    };
    return ACCENT_COLOR_MAP[accent] || ACCENT_COLOR_MAP.blue;
  };

  // Get theme-specific colors
  const getThemeColors = () => {
    if (theme === "dark") {
      return {
        background: "30, 30, 30",
        border: "60, 60, 60",
        color: "240, 240, 240",
      };
    }
    return {
      background: "255, 255, 255",
      border: "230, 230, 230",
      color: "20, 20, 20",
    };
  };

  const colors = getThemeColors();
  const accentRGB = getAccentRGB();

  return (
    <div
      className="emoji-picker-wrapper"
      style={{
        "--rgb-accent": accentRGB,
        "--rgb-background": colors.background,
        "--rgb-border": colors.border,
        "--rgb-color": colors.color,
      }}
    >
      <Picker data={data} onEmojiSelect={onSelect} theme={theme} />
    </div>
  );
}
