"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Card, FSRS } from "ts-fsrs";
import {
  calculateGrade,
  createResponseRecord,
  updateSpeedStats,
} from "@/lib/grading";
import {
  loadCards,
  loadSessionData,
  loadSettings,
  saveCards,
  saveSessionData,
} from "@/lib/storage";
import type { AppSettings, MultiplicationCard, SessionData } from "@/lib/types";

export default function Home() {
  const [cards, setCards] = useState<MultiplicationCard[]>([]);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentCard, setCurrentCard] = useState<MultiplicationCard | null>(
    null,
  );
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    show: boolean;
    correct: boolean;
    correctAnswer?: number;
    rating?: string;
    responseTime?: number;
  }>({ show: false, correct: false });
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(
    null,
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const fsrs = new FSRS({});

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
    const loadedSessionData = loadSessionData();
    const loadedSettings = loadSettings();

    setCards(loadedCards);
    setSessionData(loadedSessionData);
    setSettings(loadedSettings);
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
    if (!currentCard || !questionStartTime || !sessionData || !settings) return;

    const responseTime = performance.now() - questionStartTime;
    const userAnswerNum = parseInt(userAnswer, 10);
    const correctAnswer = currentCard.multiplicand * currentCard.multiplier;
    const isCorrect = userAnswerNum === correctAnswer;

    // Update speed statistics
    const newSpeedStats = updateSpeedStats(
      sessionData.speedStats,
      responseTime,
      settings.warmupTarget,
    );

    // Calculate FSRS rating based on accuracy and speed
    const rating = calculateGrade(isCorrect, responseTime, newSpeedStats);

    // Create response record
    const responseRecord = createResponseRecord(
      currentCard.id,
      userAnswerNum,
      correctAnswer,
      responseTime,
    );

    // Update FSRS card with the rating using scheduler
    const now = new Date();
    const reviewRecord = fsrs.repeat(currentCard.fsrsCard, now);

    let updatedFsrsCard: Card;
    switch (rating) {
      case 1: // Again
        updatedFsrsCard = reviewRecord[rating].card;
        break;
      case 2: // Hard
        updatedFsrsCard = reviewRecord[rating].card;
        break;
      case 3: // Good
        updatedFsrsCard = reviewRecord[rating].card;
        break;
      case 4: // Easy
        updatedFsrsCard = reviewRecord[rating].card;
        break;
      default:
        updatedFsrsCard = reviewRecord[3].card; // Default to Good
    }

    // Update the card in our cards array
    const updatedCards = cards.map((card) =>
      card.id === currentCard.id
        ? { ...card, fsrsCard: updatedFsrsCard }
        : card,
    );

    // Update session data
    const newSessionData: SessionData = {
      responses: [...sessionData.responses, responseRecord],
      speedStats: newSpeedStats,
      lastReviewDate: new Date(),
    };

    // Save updated data
    setCards(updatedCards);
    setSessionData(newSessionData);
    saveCards(updatedCards);
    saveSessionData(newSessionData);

    // Show feedback with rating information
    const ratingNames = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };
    setFeedback({
      show: true,
      correct: isCorrect,
      correctAnswer: correctAnswer,
      rating: ratingNames[rating as keyof typeof ratingNames],
      responseTime: Math.round(responseTime),
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

                    {feedback.responseTime && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Response time: {feedback.responseTime}ms
                        {feedback.rating && (
                          <span className="ml-2">
                            • Rating: {feedback.rating}
                            {sessionData &&
                              !sessionData.speedStats.isWarmedUp && (
                                <span className="text-xs ml-1">(warmup)</span>
                              )}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Press Enter to continue...
                    </div>
                  </div>
                )}

                {/* Stats Display */}
                <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
                  <div>
                    Card {Math.floor(Math.random() * cards.length) + 1} of{" "}
                    {cards.length}
                  </div>
                  {sessionData && (
                    <div className="mt-1">
                      {sessionData.speedStats.isWarmedUp
                        ? `Warmed up (${sessionData.responses.length} responses)`
                        : `Warmup: ${sessionData.responses.length}/${settings?.warmupTarget || 50}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
