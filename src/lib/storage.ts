import { generateArithmeticDeck } from "./cards";
import {
  type AppSettings,
  type ArithmeticCard,
  DEFAULT_SETTINGS,
  type MultiplicationCard,
  type SessionData,
} from "./types";

const STORAGE_KEYS = {
  CARDS: "multiplicationCards",
  SESSION: "sessionData",
  SETTINGS: "appSettings",
} as const;

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

function cloneDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}

function normalizeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

function normalizeSettings(partial: Partial<AppSettings>): AppSettings {
  const merged: AppSettings = {
    ...cloneDefaultSettings(),
    ...partial,
  };

  const minNumber = Math.max(
    0,
    Math.floor(normalizeNumber(merged.minNumber, DEFAULT_SETTINGS.minNumber)),
  );
  const maxCandidate = Math.floor(
    normalizeNumber(merged.maxNumber, DEFAULT_SETTINGS.maxNumber),
  );
  const maxNumber = Math.max(minNumber, maxCandidate);

  const warmupTarget = Math.max(
    1,
    Math.floor(
      normalizeNumber(merged.warmupTarget, DEFAULT_SETTINGS.warmupTarget),
    ),
  );

  return {
    ...merged,
    minNumber,
    maxNumber,
    warmupTarget,
    nonNegativeSubtraction: Boolean(merged.nonNegativeSubtraction),
    soundEnabled: Boolean(merged.soundEnabled),
    showUpcomingReviews: Boolean(merged.showUpcomingReviews),
    operationMode: merged.operationMode ?? DEFAULT_SETTINGS.operationMode,
  };
}

function hydrateFsrsCard(
  fsrsCard: ArithmeticCard["fsrsCard"],
): ArithmeticCard["fsrsCard"] {
  return {
    ...fsrsCard,
    due: new Date(fsrsCard.due),
    last_review: fsrsCard.last_review
      ? new Date(fsrsCard.last_review)
      : undefined,
  };
}

function hydrateArithmeticCard(raw: unknown): ArithmeticCard | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (
    typeof data.id !== "string" ||
    (data.operation !== "addition" && data.operation !== "subtraction") ||
    typeof data.left !== "number" ||
    typeof data.right !== "number" ||
    typeof data.fsrsCard !== "object" ||
    data.fsrsCard === null
  ) {
    return null;
  }

  const fsrsCard = data.fsrsCard as ArithmeticCard["fsrsCard"];

  return {
    id: data.id,
    operation: data.operation,
    left: data.left,
    right: data.right,
    fsrsCard: hydrateFsrsCard(fsrsCard),
  };
}

function isLegacyMultiplicationCard(raw: unknown): raw is MultiplicationCard {
  if (!raw || typeof raw !== "object") return false;
  const data = raw as Record<string, unknown>;
  return (
    typeof data.id === "string" &&
    typeof data.multiplicand === "number" &&
    typeof data.multiplier === "number" &&
    typeof data.fsrsCard === "object" &&
    data.fsrsCard !== null
  );
}

function hydrateSessionData(raw: SessionData): SessionData {
  return {
    ...raw,
    lastReviewDate: new Date(raw.lastReviewDate),
    sessionStartTime: new Date(raw.sessionStartTime || raw.lastReviewDate),
    responses: raw.responses.map((response) => ({
      ...response,
      timestamp: new Date(response.timestamp),
    })),
  };
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return cloneDefaultSettings();

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AppSettings>;
      const settings = normalizeSettings(parsed);
      saveSettings(settings);
      return settings;
    }
  } catch (error) {
    console.warn("Failed to load settings from storage:", error);
  }

  const defaults = cloneDefaultSettings();
  saveSettings(defaults);
  return defaults;
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;

  try {
    const normalized = normalizeSettings(settings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(normalized));
  } catch (error) {
    console.error("Failed to save settings to storage:", error);
  }
}

export function loadSessionData(): SessionData {
  if (typeof window === "undefined") return createDefaultSessionData();

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (stored) {
      const parsed = JSON.parse(stored) as SessionData;
      return hydrateSessionData(parsed);
    }
  } catch (error) {
    console.warn("Failed to load session data from storage:", error);
  }

  const defaults = createDefaultSessionData();
  saveSessionData(defaults);
  return defaults;
}

export function saveSessionData(data: SessionData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save session data to storage:", error);
  }
}

function buildDeckFromSettings(settings: AppSettings): ArithmeticCard[] {
  return generateArithmeticDeck({
    operationMode: settings.operationMode,
    minNumber: settings.minNumber,
    maxNumber: settings.maxNumber,
    nonNegativeSubtraction: settings.nonNegativeSubtraction,
  });
}

function saveCardsInternal(cards: ArithmeticCard[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  } catch (error) {
    console.error("Failed to save cards to storage:", error);
  }
}

function resetSession(): SessionData {
  const session = createDefaultSessionData();
  saveSessionData(session);
  return session;
}

export function regenerateDeck(
  customSettings?: AppSettings,
  options: { resetSession?: boolean } = {},
): ArithmeticCard[] {
  const settings = normalizeSettings(customSettings ?? loadSettings());
  const deck = buildDeckFromSettings(settings);
  saveCardsInternal(deck);
  if (options.resetSession ?? true) {
    resetSession();
  }
  return deck;
}

export function loadCards(customSettings?: AppSettings): ArithmeticCard[] {
  if (typeof window === "undefined") return [];

  const settings = normalizeSettings(customSettings ?? loadSettings());

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CARDS);
    if (stored) {
      const parsed = JSON.parse(stored) as unknown[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hydrated: ArithmeticCard[] = [];

        for (const raw of parsed) {
          const card = hydrateArithmeticCard(raw);
          if (card) {
            hydrated.push(card);
            continue;
          }

          if (isLegacyMultiplicationCard(raw)) {
            console.info("Legacy multiplication deck detected; regenerating.");
            return regenerateDeck(settings);
          }

          console.warn("Invalid card detected; regenerating deck.");
          return regenerateDeck(settings);
        }

        if (hydrated.length === parsed.length) {
          return hydrated;
        }
      }
    }
  } catch (error) {
    console.warn("Failed to load cards from storage:", error);
  }

  const freshDeck = buildDeckFromSettings(settings);
  saveCardsInternal(freshDeck);
  resetSession();
  return freshDeck;
}

export function saveCards(cards: ArithmeticCard[]): void {
  saveCardsInternal(cards);
}

export function clearAllData(): void {
  if (typeof window === "undefined") return;

  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

export interface ExportData {
  version: string;
  exportDate: string;
  cards: ArithmeticCard[];
  sessionData: SessionData;
  settings: AppSettings;
}

export function exportData(): string {
  const settings = loadSettings();
  const cards = loadCards(settings);
  const sessionData = loadSessionData();

  const exportData: ExportData = {
    version: "2.0.0",
    exportDate: new Date().toISOString(),
    cards,
    sessionData,
    settings,
  };

  return JSON.stringify(exportData, null, 2);
}

function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== "object") return false;
  const typed = data as Record<string, unknown>;
  if (typeof typed.version !== "string") return false;
  if (typeof typed.exportDate !== "string") return false;
  if (!Array.isArray(typed.cards)) return false;
  if (typeof typed.sessionData !== "object" || typed.sessionData === null)
    return false;
  if (typeof typed.settings !== "object" || typed.settings === null)
    return false;

  const cards = typed.cards as unknown[];
  if (
    cards.some(
      (card) =>
        !card ||
        typeof card !== "object" ||
        (card as Record<string, unknown>).operation === undefined,
    )
  ) {
    return false;
  }

  return true;
}

export function importData(jsonString: string): {
  success: boolean;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);

    if (!validateImportData(data)) {
      return { success: false, error: "Invalid data format" };
    }

    const settings = normalizeSettings(data.settings as Partial<AppSettings>);
    const rawCards = data.cards as unknown[];
    const hydratedCards: ArithmeticCard[] = [];

    for (const rawCard of rawCards) {
      if (isLegacyMultiplicationCard(rawCard)) {
        return {
          success: false,
          error:
            "Legacy multiplication backups are not compatible with the arithmetic deck.",
        };
      }
      const card = hydrateArithmeticCard(rawCard);
      if (!card) {
        return { success: false, error: "Invalid card data" };
      }
      hydratedCards.push(card);
    }

    const sessionData = hydrateSessionData(data.sessionData as SessionData);

    saveSettings(settings);
    saveCardsInternal(hydratedCards);
    saveSessionData(sessionData);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function downloadBackup(): void {
  if (typeof window === "undefined") return;

  const jsonData = exportData();
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `arithmetic-fsrs-backup-${timestamp}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
