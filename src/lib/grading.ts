import { Rating } from "ts-fsrs";
import type { ResponseRecord, SpeedStats } from "./types";

/**
 * Calculate percentiles from an array of response times
 */
function calculatePercentiles(times: number[]): {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
} {
  if (times.length === 0) {
    return { p25: 0, p50: 0, p75: 0, p90: 0 };
  }

  const sorted = [...times].sort((a, b) => a - b);
  const len = sorted.length;

  return {
    p25: sorted[Math.floor(len * 0.25)],
    p50: sorted[Math.floor(len * 0.5)],
    p75: sorted[Math.floor(len * 0.75)],
    p90: sorted[Math.floor(len * 0.9)],
  };
}

/**
 * Update speed statistics with a new response time
 */
export function updateSpeedStats(
  currentStats: SpeedStats,
  responseTime: number,
  warmupTarget: number = 50,
): SpeedStats {
  const newResponses = [...currentStats.responses, responseTime];
  const isWarmedUp = newResponses.length >= warmupTarget;

  return {
    responses: newResponses,
    percentiles: calculatePercentiles(newResponses),
    isWarmedUp,
  };
}

/**
 * Calculate FSRS rating based on accuracy and speed
 */
export function calculateGrade(
  correct: boolean,
  responseTime: number,
  speedStats: SpeedStats,
): Rating {
  if (!correct) return Rating.Again;

  if (!speedStats.isWarmedUp) {
    return Rating.Good; // Default during warmup
  }

  if (responseTime <= speedStats.percentiles.p25) return Rating.Easy;
  if (responseTime <= speedStats.percentiles.p50) return Rating.Good;
  if (responseTime <= speedStats.percentiles.p75) return Rating.Hard;
  return Rating.Again; // Very slow, even if correct
}

/**
 * Create a response record from user input
 */
export function createResponseRecord(
  cardId: string,
  userAnswer: number,
  correctAnswer: number,
  responseTime: number,
): ResponseRecord {
  return {
    cardId,
    answer: userAnswer,
    correct: userAnswer === correctAnswer,
    responseTime,
    timestamp: new Date(),
  };
}
