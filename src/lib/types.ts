import type { Card } from "ts-fsrs";

export interface MultiplicationCard {
  id: string;
  multiplicand: number; // 2-9
  multiplier: number; // 2-99
  fsrsCard: Card; // ts-fsrs Card object
}

export interface ResponseRecord {
  cardId: string;
  answer: number;
  correct: boolean;
  responseTime: number; // milliseconds
  timestamp: Date;
}

export interface SpeedStats {
  responses: number[];
  percentiles: { p25: number; p50: number; p75: number; p90: number };
  isWarmedUp: boolean; // true after 50+ responses
}

export interface SessionData {
  responses: ResponseRecord[];
  speedStats: SpeedStats;
  lastReviewDate: Date;
  sessionStartTime: Date;
  totalSessionTime: number; // milliseconds
}

export interface AppSettings {
  warmupTarget: number;
  soundEnabled: boolean;
  showUpcomingReviews: boolean;
}
