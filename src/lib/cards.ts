import { createEmptyCard } from "ts-fsrs";
import type { AppSettings, ArithmeticCard, ArithmeticOperation } from "./types";
import { createArithmeticCardId } from "./types";

export interface DeckGenerationOptions {
  operationMode: AppSettings["operationMode"];
  minNumber: number;
  maxNumber: number;
  nonNegativeSubtraction: boolean;
}

function createArithmeticCard(
  operation: ArithmeticOperation,
  left: number,
  right: number,
): ArithmeticCard {
  return {
    id: createArithmeticCardId(operation, left, right),
    operation,
    left,
    right,
    fsrsCard: createEmptyCard(),
  };
}

function generateAdditionCards(
  minNumber: number,
  maxNumber: number,
): ArithmeticCard[] {
  const cards: ArithmeticCard[] = [];
  for (let left = minNumber; left <= maxNumber; left++) {
    for (let right = minNumber; right <= maxNumber; right++) {
      cards.push(createArithmeticCard("addition", left, right));
    }
  }
  return cards;
}

function generateSubtractionCards(
  minNumber: number,
  maxNumber: number,
  nonNegativeOnly: boolean,
): ArithmeticCard[] {
  const cards: ArithmeticCard[] = [];
  for (let left = minNumber; left <= maxNumber; left++) {
    for (let right = minNumber; right <= maxNumber; right++) {
      if (nonNegativeOnly && left - right < 0) {
        continue;
      }
      cards.push(createArithmeticCard("subtraction", left, right));
    }
  }
  return cards;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateArithmeticDeck(
  options: DeckGenerationOptions,
): ArithmeticCard[] {
  const { operationMode, minNumber, maxNumber, nonNegativeSubtraction } =
    options;

  const additionCards =
    operationMode === "addition" || operationMode === "mixed"
      ? generateAdditionCards(minNumber, maxNumber)
      : [];

  const subtractionCards =
    operationMode === "subtraction" || operationMode === "mixed"
      ? generateSubtractionCards(minNumber, maxNumber, nonNegativeSubtraction)
      : [];

  const deck = [...additionCards, ...subtractionCards];
  return shuffleArray(deck);
}
