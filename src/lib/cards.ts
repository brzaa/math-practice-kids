import { createEmptyCard } from "ts-fsrs";
import type {
  AppSettings,
  ArithmeticCard,
  ArithmeticOperation,
  DifficultyMode,
} from "./types";
import { createArithmeticCardId } from "./types";

export interface DeckGenerationOptions {
  operationMode: AppSettings["operationMode"];
  minNumber: number;
  maxNumber: number;
  nonNegativeSubtraction: boolean;
  difficultyMode: DifficultyMode;
}

function createArithmeticCard(
  operation: ArithmeticOperation,
  left: number,
  right: number,
  difficultyWeight: number,
): ArithmeticCard {
  return {
    id: createArithmeticCardId(operation, left, right),
    operation,
    left,
    right,
    fsrsCard: createEmptyCard(),
    difficultyWeight,
  };
}

function computeBoundarySet(
  options: Pick<DeckGenerationOptions, "minNumber" | "maxNumber">,
): number[] {
  const boundaries = new Set<number>();
  const upper = Math.max(options.maxNumber, 20);
  for (let value = 10; value <= upper; value += 10) {
    if (value >= options.minNumber && value <= options.maxNumber) {
      boundaries.add(value);
    }
  }
  boundaries.add(options.maxNumber);
  return Array.from(boundaries.values()).sort((a, b) => a - b);
}

function computeDifficultyWeight(
  operation: ArithmeticOperation,
  left: number,
  right: number,
  options: DeckGenerationOptions,
  boundaryTargets: number[],
): number {
  if (options.difficultyMode !== "focus-boundaries") {
    return 1;
  }

  const result = operation === "addition" ? left + right : left - right;

  const bridgesTen =
    operation === "addition" && (left % 10) + (right % 10) >= 10;

  const requiresBorrow =
    operation === "subtraction" && left % 10 < right % 10 && left >= right;

  const nearBoundary = boundaryTargets.some(
    (target) =>
      Math.abs(left - target) <= 2 ||
      Math.abs(right - target) <= 2 ||
      Math.abs(result - target) <= 2,
  );

  if (bridgesTen || requiresBorrow) {
    return 3;
  }

  if (nearBoundary) {
    return 2;
  }

  return 1;
}

function generateAdditionCards(
  minNumber: number,
  maxNumber: number,
  options: DeckGenerationOptions,
  boundaryTargets: number[],
): ArithmeticCard[] {
  const cards: ArithmeticCard[] = [];
  for (let left = minNumber; left <= maxNumber; left++) {
    for (let right = minNumber; right <= maxNumber; right++) {
      const weight = computeDifficultyWeight(
        "addition",
        left,
        right,
        options,
        boundaryTargets,
      );
      cards.push(createArithmeticCard("addition", left, right, weight));
    }
  }
  return cards;
}

function generateSubtractionCards(
  minNumber: number,
  maxNumber: number,
  nonNegativeOnly: boolean,
  options: DeckGenerationOptions,
  boundaryTargets: number[],
): ArithmeticCard[] {
  const cards: ArithmeticCard[] = [];
  for (let left = minNumber; left <= maxNumber; left++) {
    for (let right = minNumber; right <= maxNumber; right++) {
      if (nonNegativeOnly && left - right < 0) {
        continue;
      }

      const weight = computeDifficultyWeight(
        "subtraction",
        left,
        right,
        options,
        boundaryTargets,
      );
      cards.push(createArithmeticCard("subtraction", left, right, weight));
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
  const boundaryTargets = computeBoundarySet(options);

  const additionCards =
    operationMode === "addition" || operationMode === "mixed"
      ? generateAdditionCards(minNumber, maxNumber, options, boundaryTargets)
      : [];

  const subtractionCards =
    operationMode === "subtraction" || operationMode === "mixed"
      ? generateSubtractionCards(
          minNumber,
          maxNumber,
          nonNegativeSubtraction,
          options,
          boundaryTargets,
        )
      : [];

  const deck = [...additionCards, ...subtractionCards];
  return shuffleArray(deck);
}
