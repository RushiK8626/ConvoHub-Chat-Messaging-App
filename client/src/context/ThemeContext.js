import React, { createContext, useContext, useState, useEffect } from "react";
import { colord } from "colord";

const ThemeContext = createContext();

const ACCENT_COLOR_MAP = {
  blue: "#007AFF",
  red: "#FF3B30",
  orange: "#FF9500",
  green: "#34C759",
  purple: "#AF52DE",
};

// Generate dynamic colors based on accent
const generateDynamicColors = (accentColor, isDark) => {
  const accent = colord(accentColor);
  
  if (isDark) {
    return {
      '--accent-color': accentColor,
      '--primary-color': accentColor,
      '--primary-light': accent.alpha(0.13).toRgbString(),
      '--border-color': accent.darken(0.4).desaturate(0.3).toHex(),
      '--icon-background': accent.darken(0.5).desaturate(0.5).toHex(),
      '--message-received-bg': accent.darken(0.5).desaturate(0.5).toHex(),
      '--message-sent-bg': accentColor,
      '--input-background': accent.darken(0.5).desaturate(0.5).toHex(),
      '--hover-background': accent.darken(0.3).desaturate(0.3).toHex(),
      '--shadow': accent.alpha(0.10).toRgbString(),
      '--modal-overlay': accent.alpha(0.10).toRgbString(),
      '--avatar-bg': accent.darken(0.3).desaturate(0.3).toHex(),
      '--sender-name-color': accentColor,
    };
  } else {
    return {
      '--accent-color': accentColor,
      '--primary-color': accentColor,
      '--primary-light': accent.alpha(0.10).toRgbString(),
      '--border-color': accent.lighten(0.3).desaturate(0.2).toHex(),
      '--icon-background': accent.lighten(0.4).desaturate(0.4).toHex(),
      '--message-received-bg': accent.lighten(0.45).desaturate(0.5).toHex(),
      '--message-sent-bg': accentColor,
      '--input-background': accent.lighten(0.45).desaturate(0.5).toHex(),
      '--hover-background': accent.lighten(0.35).desaturate(0.4).toHex(),
      '--shadow': accent.alpha(0.08).toRgbString(),
      '--modal-overlay': accent.alpha(0.08).toRgbString(),
      '--avatar-bg': accent.lighten(0.35).desaturate(0.4).toHex(),
      '--sender-name-color': accentColor,
    };
  }
};

const applyDynamicColors = (accentColor, isDark) => {
  const colors = generateDynamicColors(accentColor, isDark);
  const root = document.documentElement;
  
  Object.entries(colors).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};

const initializeTheme = () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  return savedTheme;
};

const initializeAccent = (theme) => {
  const savedAccent = localStorage.getItem("accentColor") || "blue";
  const color = ACCENT_COLOR_MAP[savedAccent] || ACCENT_COLOR_MAP.blue;
  applyDynamicColors(color, theme === "dark");
  return savedAccent;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(initializeTheme);
  const [accent, setAccent] = useState(() => initializeAccent(initializeTheme()));

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme === "dark" ? "dark" : "light";
    localStorage.setItem("theme", theme);

    // Reapply colors when theme changes
    const color = ACCENT_COLOR_MAP[accent] || ACCENT_COLOR_MAP.blue;
    applyDynamicColors(color, theme === "dark");

    void root.offsetWidth;
  }, [theme, accent]);

  useEffect(() => {
    const root = document.documentElement; // Add this line
    const color = ACCENT_COLOR_MAP[accent] || ACCENT_COLOR_MAP.blue;
    applyDynamicColors(color, theme === "dark");
    localStorage.setItem("accentColor", accent);

    void root.offsetWidth;
  }, [accent, theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const setLightTheme = () => setTheme("light");
  const setDarkTheme = () => setTheme("dark");

  const setAccentColor = (accentId) => {
    if (ACCENT_COLOR_MAP[accentId]) setAccent(accentId);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setLightTheme,
        setDarkTheme,
        isDark: theme === "dark",
        accent,
        setAccent: setAccentColor,
        ACCENT_COLOR_MAP,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};