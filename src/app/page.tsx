"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadCards } from "@/lib/storage";
import type { MultiplicationCard } from "@/lib/types";

export default function Home() {
  const [cards, setCards] = useState<MultiplicationCard[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentCard, setCurrentCard] = useState<MultiplicationCard | null>(
    null,
  );
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    show: boolean;
    correct: boolean;
    correctAnswer?: number;
  }>({ show: false, correct: false });
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(
    null,
  );

  const inputRef = useRef<HTMLInputElement>(null);

  const selectRandomCard = useCallback((cardList: MultiplicationCard[]) => {
    const randomIndex = Math.floor(Math.random() * cardList.length);
    const card = cardList[randomIndex];
    setCurrentCard(card);
    setQuestionStartTime(performance.now());
    setFeedback({ show: false, correct: false });
    setUserAnswer("");

    // Focus input after a brief delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    const loadedCards = loadCards();
    setCards(loadedCards);
    setIsLoaded(true);

    if (loadedCards.length > 0) {
      selectRandomCard(loadedCards);
    }
  }, [selectRandomCard]);

  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && feedback.show) {
        e.preventDefault();
        selectRandomCard(cards);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyPress);
    return () => window.removeEventListener("keydown", handleGlobalKeyPress);
  }, [feedback.show, selectRandomCard, cards]);

  const handleSubmitAnswer = () => {
    if (!currentCard || !questionStartTime) return;

    const _responseTime = performance.now() - questionStartTime;
    const userAnswerNum = parseInt(userAnswer, 10);
    const correctAnswer = currentCard.multiplicand * currentCard.multiplier;
    const isCorrect = userAnswerNum === correctAnswer;

    setFeedback({
      show: true,
      correct: isCorrect,
      correctAnswer: correctAnswer,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && userAnswer && !feedback.show) {
      handleSubmitAnswer();
    } else if (e.key === "Enter" && feedback.show) {
      e.preventDefault();
      selectRandomCard(cards);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numeric input
    if (value === "" || /^\d+$/.test(value)) {
      setUserAnswer(value);
    }
  };

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
          {currentCard && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
              <div className="text-center">
                {/* Question Display */}
                <div className="mb-8">
                  <div className="text-6xl font-bold text-gray-900 dark:text-white mb-6">
                    {currentCard.multiplicand} × {currentCard.multiplier} = ?
                  </div>
                </div>

                {/* Answer Input */}
                {!feedback.show ? (
                  <div className="mb-6">
                    <input
                      ref={inputRef}
                      type="text"
                      value={userAnswer}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      className="text-4xl font-bold text-center w-64 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      placeholder="Your answer"
                      maxLength={5}
                    />
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleSubmitAnswer}
                        disabled={!userAnswer}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors"
                      >
                        Submit
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Press Enter to submit
                    </p>
                  </div>
                ) : (
                  /* Feedback Display */
                  <div className="mb-6">
                    <div
                      className={`text-4xl font-bold mb-4 ${
                        feedback.correct
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {feedback.correct ? "✓ Correct!" : "✗ Incorrect"}
                    </div>

                    {!feedback.correct && (
                      <div className="text-2xl text-gray-700 dark:text-gray-300">
                        The correct answer is{" "}
                        <span className="font-bold">
                          {feedback.correctAnswer}
                        </span>
                      </div>
                    )}

                    <div className="text-lg text-gray-600 dark:text-gray-400 mt-4">
                      {feedback.correct ? "Great job!" : "Keep practicing!"}
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Press Enter to continue...
                    </div>
                  </div>
                )}

                {/* Stats Display */}
                <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
                  Card {Math.floor(Math.random() * cards.length) + 1} of{" "}
                  {cards.length}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
