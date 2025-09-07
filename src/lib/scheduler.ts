import type { Card } from "ts-fsrs";
import type { MultiplicationCard } from "./types";

/**
 * Check if a card is due for review
 */
export function isCardDue(card: Card, now: Date = new Date()): boolean {
  return card.due.getTime() <= now.getTime();
}

/**
 * Get all cards that are due for review
 */
export function getDueCards(
  cards: MultiplicationCard[],
  now: Date = new Date(),
): MultiplicationCard[] {
  return cards.filter((card) => isCardDue(card.fsrsCard, now));
}

/**
 * Get cards that are not yet due for review
 */
export function getNotDueCards(
  cards: MultiplicationCard[],
  now: Date = new Date(),
): MultiplicationCard[] {
  return cards.filter((card) => !isCardDue(card.fsrsCard, now));
}

/**
 * Sort cards by their due date (earliest first)
 */
export function sortCardsByDueDate(
  cards: MultiplicationCard[],
): MultiplicationCard[] {
  return [...cards].sort(
    (a, b) => a.fsrsCard.due.getTime() - b.fsrsCard.due.getTime(),
  );
}

/**
 * Sort cards by their state priority for learning
 * Priority order: New -> Learning -> Review -> Relearning
 */
export function sortCardsByStatePriority(
  cards: MultiplicationCard[],
): MultiplicationCard[] {
  const statePriority = { 0: 0, 1: 1, 2: 2, 3: 1.5 }; // New, Learning, Review, Relearning

  return [...cards].sort((a, b) => {
    const priorityA =
      statePriority[a.fsrsCard.state as keyof typeof statePriority] ?? 999;
    const priorityB =
      statePriority[b.fsrsCard.state as keyof typeof statePriority] ?? 999;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // If same priority, sort by due date
    return a.fsrsCard.due.getTime() - b.fsrsCard.due.getTime();
  });
}

/**
 * Get the next card to review based on FSRS scheduling principles
 * Priority: Due cards first (by state priority), then new cards
 */
export function getNextCard(
  cards: MultiplicationCard[],
  now: Date = new Date(),
): MultiplicationCard | null {
  if (cards.length === 0) return null;

  const dueCards = getDueCards(cards, now);
  const notDueCards = getNotDueCards(cards, now);

  // First priority: Due cards, sorted by state priority
  if (dueCards.length > 0) {
    const sortedDueCards = sortCardsByStatePriority(dueCards);
    return sortedDueCards[0];
  }

  // Second priority: New cards (state 0) that aren't due yet
  const newCards = notDueCards.filter((card) => card.fsrsCard.state === 0);
  if (newCards.length > 0) {
    // For new cards, we can randomize to add variety
    const randomIndex = Math.floor(
      Math.random() * Math.min(5, newCards.length),
    );
    return newCards[randomIndex];
  }

  // Fallback: Any card, sorted by due date
  const sortedCards = sortCardsByDueDate(cards);
  return sortedCards[0];
}

/**
 * Get statistics about the card collection
 */
export function getCardStats(
  cards: MultiplicationCard[],
  now: Date = new Date(),
): {
  total: number;
  due: number;
  new: number;
  learning: number;
  review: number;
  relearning: number;
  averageInterval: number;
} {
  const dueCards = getDueCards(cards, now);

  const stats = cards.reduce(
    (acc, card) => {
      const state = card.fsrsCard.state;
      switch (state) {
        case 0:
          acc.new++;
          break;
        case 1:
          acc.learning++;
          break;
        case 2:
          acc.review++;
          break;
        case 3:
          acc.relearning++;
          break;
      }
      acc.totalInterval += card.fsrsCard.elapsed_days;
      return acc;
    },
    {
      new: 0,
      learning: 0,
      review: 0,
      relearning: 0,
      totalInterval: 0,
    },
  );

  return {
    total: cards.length,
    due: dueCards.length,
    new: stats.new,
    learning: stats.learning,
    review: stats.review,
    relearning: stats.relearning,
    averageInterval: cards.length > 0 ? stats.totalInterval / cards.length : 0,
  };
}

/**
 * Get upcoming review counts for the next few days
 */
export function getUpcomingReviews(
  cards: MultiplicationCard[],
  days: number = 7,
): number[] {
  const now = new Date();
  const dailyCounts = new Array(days).fill(0);

  cards.forEach((card) => {
    const dueDate = card.fsrsCard.due;
    const daysDiff = Math.floor(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff >= 0 && daysDiff < days) {
      dailyCounts[daysDiff]++;
    }
  });

  return dailyCounts;
}
