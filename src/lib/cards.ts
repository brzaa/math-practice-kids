import { createEmptyCard } from "ts-fsrs";
import type { MultiplicationCard } from "./types";

/**
 * Fisher-Yates shuffle algorithm to randomize array order
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generates all 784 multiplication cards (2-9 × 2-99)
 * Cards are shuffled to avoid predictable sequences
 */
export function generateMultiplicationCards(): MultiplicationCard[] {
  const cards: MultiplicationCard[] = [];

  // Generate multiplicands 2-9 and multipliers 2-99
  for (let multiplicand = 2; multiplicand <= 9; multiplicand++) {
    for (let multiplier = 2; multiplier <= 99; multiplier++) {
      const id = `${multiplicand}x${multiplier}`;

      cards.push({
        id,
        multiplicand,
        multiplier,
        fsrsCard: createEmptyCard(),
      });
    }
  }

  // Shuffle the cards to avoid predictable sequences
  return shuffleArray(cards);
}

/**
 * Get the correct answer for a multiplication card
 */
export function getAnswer(card: MultiplicationCard): number {
  return card.multiplicand * card.multiplier;
}

/**
 * Check if an answer is correct for a given card
 */
export function isCorrect(card: MultiplicationCard, answer: number): boolean {
  return answer === getAnswer(card);
}

/**
 * Format a card as a question string (e.g., "7 × 23")
 */
export function formatQuestion(card: MultiplicationCard): string {
  return `${card.multiplicand} × ${card.multiplier}`;
}
