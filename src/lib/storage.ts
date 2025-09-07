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
    soundEnabled: true,
    showUpcomingReviews: true,
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
        // Parse dates that were serialized as strings in FSRS cards
        return cards.map((card) => ({
          ...card,
          fsrsCard: {
            ...card.fsrsCard,
            due: new Date(card.fsrsCard.due),
            last_review: card.fsrsCard.last_review
              ? new Date(card.fsrsCard.last_review)
              : undefined,
          },
        }));
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

/**
 * Export data structure for JSON backup
 */
export interface ExportData {
  version: string;
  exportDate: string;
  cards: MultiplicationCard[];
  sessionData: SessionData;
  settings: AppSettings;
}

/**
 * Export all data as JSON string
 */
export function exportData(): string {
  const cards = loadCards();
  const sessionData = loadSessionData();
  const settings = loadSettings();

  const exportData: ExportData = {
    version: "1.0.0",
    exportDate: new Date().toISOString(),
    cards,
    sessionData,
    settings,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Validate imported data structure
 */
function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== "object") return false;
  const typedData = data as Record<string, unknown>;
  if (!typedData.version || typeof typedData.version !== "string") return false;
  if (!typedData.exportDate || typeof typedData.exportDate !== "string")
    return false;
  if (!Array.isArray(typedData.cards)) return false;
  if (!typedData.sessionData || typeof typedData.sessionData !== "object")
    return false;
  if (!typedData.settings || typeof typedData.settings !== "object")
    return false;

  // Validate cards structure
  if (typedData.cards.length !== 784) return false;
  const sampleCard = (typedData.cards as unknown[])[0] as Record<
    string,
    unknown
  >;
  if (
    !sampleCard?.id ||
    !sampleCard?.fsrsCard ||
    typeof sampleCard.multiplicand !== "number"
  )
    return false;

  // Validate session data structure
  const sessionData = typedData.sessionData as Record<string, unknown>;
  if (!Array.isArray(sessionData.responses)) return false;
  if (!sessionData.speedStats || !sessionData.lastReviewDate) return false;

  return true;
}

/**
 * Import data from JSON string
 */
export function importData(jsonString: string): {
  success: boolean;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);

    if (!validateImportData(data)) {
      return { success: false, error: "Invalid data format" };
    }

    // Parse dates in cards (data is validated as ExportData)
    const cards = data.cards.map((card) => ({
      ...card,
      fsrsCard: {
        ...card.fsrsCard,
        due: new Date(card.fsrsCard.due as unknown as string),
        last_review: card.fsrsCard.last_review
          ? new Date(card.fsrsCard.last_review as unknown as string)
          : undefined,
      },
    }));

    // Parse dates in session data
    const sessionData = {
      ...data.sessionData,
      lastReviewDate: new Date(
        data.sessionData.lastReviewDate as unknown as string,
      ),
      sessionStartTime: new Date(
        data.sessionData.sessionStartTime as unknown as string,
      ),
      responses: data.sessionData.responses.map((r) => ({
        ...r,
        timestamp: new Date(r.timestamp as unknown as string),
      })),
    };

    // Save imported data
    saveCards(cards);
    saveSessionData(sessionData);
    saveSettings(data.settings);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create and download backup file
 */
export function downloadBackup(): void {
  if (typeof window === "undefined") return;

  const jsonData = exportData();
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const filename = `times-table-fsrs-backup-${timestamp}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
