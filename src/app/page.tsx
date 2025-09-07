"use client";

import { useEffect, useState } from "react";
import { loadCards } from "@/lib/storage";
import type { MultiplicationCard } from "@/lib/types";

export default function Home() {
  const [cards, setCards] = useState<MultiplicationCard[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadedCards = loadCards();
    setCards(loadedCards);
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading cards...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Multiplication Table Practice
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Learn multiplication tables using spaced repetition
          </p>
        </header>

        <main className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Card Generation Complete
              </h2>
              <div className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                Successfully generated{" "}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {cards.length}
                </span>{" "}
                multiplication cards
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div>
                  <span className="font-semibold">Multiplicands:</span> 2-9
                </div>
                <div>
                  <span className="font-semibold">Multipliers:</span> 2-99
                </div>
              </div>

              <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Stage 1 Complete ✅
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>✅ ts-fsrs dependency installed</li>
                  <li>✅ Card generation utility created</li>
                  <li>✅ localStorage persistence implemented</li>
                  <li>✅ Basic app layout with Tailwind</li>
                  <li>✅ 784 cards generated and stored</li>
                </ul>
              </div>

              <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                Next: Stage 2 - Core Practice Interface
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
