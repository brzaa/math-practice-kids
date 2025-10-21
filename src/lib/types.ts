import type { Card } from "ts-fsrs";

export type ArithmeticOperation = "addition" | "subtraction";
export type OperationMode = ArithmeticOperation | "mixed";
export type DifficultyMode = "balanced" | "focus-boundaries";

export interface ArithmeticCard {
  id: string;
  operation: ArithmeticOperation;
  left: number;
  right: number;
  fsrsCard: Card;
  difficultyWeight: number;
}

/**
 * Legacy card shape retained for migration of existing multiplication data.
 */
export interface MultiplicationCard {
  id: string;
  multiplicand: number;
  multiplier: number;
  fsrsCard: Card;
}

export type StudyCard = ArithmeticCard;

export interface ResponseRecord {
  cardId: string;
  answer: number;
  correct: boolean;
  responseTime: number;
  timestamp: Date;
}

export interface SpeedStats {
  responses: number[];
  percentiles: { p25: number; p50: number; p75: number; p90: number };
  isWarmedUp: boolean;
}

export interface SessionData {
  responses: ResponseRecord[];
  speedStats: SpeedStats;
  lastReviewDate: Date;
  sessionStartTime: Date;
  totalSessionTime: number;
}

export interface AppSettings {
  warmupTarget: number;
  soundEnabled: boolean;
  showUpcomingReviews: boolean;
  operationMode: OperationMode;
  minNumber: number;
  maxNumber: number;
  nonNegativeSubtraction: boolean;
  difficultyMode: DifficultyMode;
  timedChallengeEnabled: boolean;
  timedChallengeDuration: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  warmupTarget: 50,
  soundEnabled: true,
  showUpcomingReviews: true,
  operationMode: "mixed",
  minNumber: 0,
  maxNumber: 20,
  nonNegativeSubtraction: true,
  difficultyMode: "balanced",
  timedChallengeEnabled: false,
  timedChallengeDuration: 60,
};

export function createArithmeticCardId(
  operation: ArithmeticOperation,
  left: number,
  right: number,
): string {
  return `arith:${operation}:${left}:${right}`;
}

export function formatQuestion(card: ArithmeticCard): string {
  if (card.operation === "addition") {
    return `${card.left} + ${card.right}`;
  }
  return `${card.left} − ${card.right}`;
}

export function evaluateCard(card: ArithmeticCard): number {
  return card.operation === "addition"
    ? card.left + card.right
    : card.left - card.right;
}

export function isCorrect(
  card: ArithmeticCard,
  answer: number | string,
): boolean {
  const parsed =
    typeof answer === "number" ? answer : Number.parseInt(answer, 10);
  if (Number.isNaN(parsed)) {
    return false;
  }
  return parsed === evaluateCard(card);
}
