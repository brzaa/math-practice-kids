import { generateMultiplicationCards } from "./cards";
import type { AppSettings, MultiplicationCard, SessionData } from "./types";

const STORAGE_KEYS = {
  CARDS: "multiplicationCards",
  SESSION: "sessionData",
  SETTINGS: "appSettings",
} as const;

/**
 * Initialize default session data
 */
function createDefaultSessionData(): SessionData {
  const now = new Date();
  return {
    responses: [],
    speedStats: {
      responses: [],
      percentiles: { p25: 0, p50: 0, p75: 0, p90: 0 },
      isWarmedUp: false,
    },
    lastReviewDate: now,
    sessionStartTime: now,
    totalSessionTime: 0,
  };
}

/**
 * Initialize default app settings
 */
function createDefaultSettings(): AppSettings {
  return {
    warmupTarget: 50,
  };
}

/**
 * Load multiplication cards from localStorage or generate them if not found
 */
export function loadCards(): MultiplicationCard[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CARDS);
    if (stored) {
      const cards = JSON.parse(stored) as MultiplicationCard[];
      // Verify we have the expected number of cards
      if (cards.length === 784) {
        return cards;
      }
    }
  } catch (error) {
    console.warn("Failed to load cards from storage:", error);
  }

  // Generate new cards if loading failed or incomplete
  const cards = generateMultiplicationCards();
  saveCards(cards);
  return cards;
}

/**
 * Save multiplication cards to localStorage
 */
export function saveCards(cards: MultiplicationCard[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  } catch (error) {
    console.error("Failed to save cards to storage:", error);
  }
}

/**
 * Load session data from localStorage
 */
export function loadSessionData(): SessionData {
  if (typeof window === "undefined") return createDefaultSessionData();

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (stored) {
      const data = JSON.parse(stored) as SessionData;
      // Parse dates that were serialized as strings
      data.lastReviewDate = new Date(data.lastReviewDate);
      data.sessionStartTime = new Date(
        data.sessionStartTime || data.lastReviewDate,
      );
      data.totalSessionTime = data.totalSessionTime || 0;
      data.responses = data.responses.map((r) => ({
        ...r,
        timestamp: new Date(r.timestamp),
      }));
      return data;
    }
  } catch (error) {
    console.warn("Failed to load session data from storage:", error);
  }

  const defaultData = createDefaultSessionData();
  saveSessionData(defaultData);
  return defaultData;
}

/**
 * Save session data to localStorage
 */
export function saveSessionData(data: SessionData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save session data to storage:", error);
  }
}

/**
 * Load app settings from localStorage
 */
export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return createDefaultSettings();

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      return JSON.parse(stored) as AppSettings;
    }
  } catch (error) {
    console.warn("Failed to load settings from storage:", error);
  }

  const defaultSettings = createDefaultSettings();
  saveSettings(defaultSettings);
  return defaultSettings;
}

/**
 * Save app settings to localStorage
 */
export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings to storage:", error);
  }
}

/**
 * Clear all stored data (useful for development/testing)
 */
export function clearAllData(): void {
  if (typeof window === "undefined") return;

  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}
