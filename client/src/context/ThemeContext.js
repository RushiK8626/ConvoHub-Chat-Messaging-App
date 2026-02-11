import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

// Initialize theme BEFORE component renders to prevent flash
const initializeTheme = () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  return savedTheme;
};

// Initialize accent color BEFORE component renders
const initializeAccent = () => {
  const savedAccent = localStorage.getItem("accentColor") || "blue";
  const ACCENT_COLOR_MAP = {
    blue: "#007AFF",
    red: "#FF3B30",
    orange: "#FF9500",
    green: "#34C759",
    purple: "#AF52DE",
  };
  const color = ACCENT_COLOR_MAP[savedAccent] || ACCENT_COLOR_MAP.blue;
  document.documentElement.style.setProperty("--accent-color", color);
  document.documentElement.style.setProperty("--primary-color", color);
  document.documentElement.style.setProperty("--message-sent-bg", color);
  return savedAccent;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(initializeTheme);
  const [accent, setAccent] = useState(initializeAccent);

  // Accent colors supported by the app (id -> hex)
  const ACCENT_COLOR_MAP = {
    blue: "#007AFF",
    red: "#FF3B30",
    orange: "#FF9500",
    green: "#34C759",
    purple: "#AF52DE",
  };

  useEffect(() => {
    // Force apply theme to document root
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme === "dark" ? "dark" : "light";
    localStorage.setItem("theme", theme);

    // Trigger a reflow to ensure styles are applied
    void root.offsetWidth;
  }, [theme]);

  // Apply accent color CSS variable and persist
  useEffect(() => {
    const root = document.documentElement;
    const color = ACCENT_COLOR_MAP[accent] || ACCENT_COLOR_MAP.blue;
    root.style.setProperty("--accent-color", color);
    root.style.setProperty("--primary-color", color);
    root.style.setProperty("--message-sent-bg", color);

    localStorage.setItem("accentColor", accent);

    // Trigger a reflow to ensure styles are applied
    void root.offsetWidth;
  }, [accent, ACCENT_COLOR_MAP]);

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
