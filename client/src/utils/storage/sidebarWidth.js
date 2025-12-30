/**
 * Utility to manage consistent sidebar width across pages
 * Uses localStorage to persist the width across navigation
 */

const SIDEBAR_WIDTH_KEY = "convohub_sidebar_width";
const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 320;
const MAX_WIDTH = 650;

export const getSidebarWidth = () => {
  try {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) {
      const width = parseInt(saved);
      return Math.max(MIN_WIDTH, Math.min(width, MAX_WIDTH));
    }
  } catch (e) {
    console.error("Error reading sidebar width:", e);
  }
  return DEFAULT_WIDTH;
};

export const setSidebarWidth = (width) => {
  try {
    const validWidth = Math.max(MIN_WIDTH, Math.min(width, MAX_WIDTH));
    localStorage.setItem(SIDEBAR_WIDTH_KEY, validWidth.toString());
    return validWidth;
  } catch (e) {
    console.error("Error saving sidebar width:", e);
    return width;
  }
};

export const SIDEBAR_CONFIG = {
  DEFAULT_WIDTH,
  MIN_WIDTH,
  MAX_WIDTH,
};
