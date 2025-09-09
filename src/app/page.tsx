"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Card, FSRS, Rating } from "ts-fsrs";
import ProgressDashboard from "@/components/ProgressDashboard";
import Settings from "@/components/Settings";
import StatisticsChart from "@/components/StatisticsChart";
import {
  calculateGrade,
  createResponseRecord,
  updateSpeedStats,
} from "@/lib/grading";
import { getCardStats, getNextCard, getUpcomingReviews } from "@/lib/scheduler";
import {
  loadCards,
  loadSessionData,
  loadSettings,
  saveCards,
  saveSessionData,
  saveSettings,
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
    userAnswer?: number;
    rating?: string;
    responseTime?: number;
  }>({ show: false, correct: false });
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(
    null,
  );
  const [cardStats, setCardStats] = useState<ReturnType<
    typeof getCardStats
  > | null>(null);
  const [upcomingReviews, setUpcomingReviews] = useState<number[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [showProgressDashboard, setShowProgressDashboard] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fsrs = new FSRS({});

  // Play celebration sound for correct answers
  const playCelebrationSound = () => {
    if (!settings?.soundEnabled) return;

    try {
      const audio = new Audio("/sound-fx/0.wav");
      audio.volume = 0.3; // Set volume to 30% to not be too loud
      audio.play().catch((error) => {
        console.warn("Could not play celebration sound:", error);
      });
    } catch (error) {
      console.warn("Could not load celebration sound:", error);
    }
  };

  const selectNextCard = useCallback((cardList: MultiplicationCard[]) => {
    const nextCard = getNextCard(cardList);
    if (!nextCard) return;

    setCurrentCard(nextCard);
    setQuestionStartTime(performance.now());
    setFeedback({ show: false, correct: false });
    setUserAnswer("");

    // Update card stats and upcoming reviews
    setCardStats(getCardStats(cardList));
    setUpcomingReviews(getUpcomingReviews(cardList));

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

    // Start new session if it's been more than 4 hours since last review
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    if (loadedSessionData.lastReviewDate < fourHoursAgo) {
      const newSessionData = {
        ...loadedSessionData,
        sessionStartTime: now,
        totalSessionTime: 0,
      };
      setSessionData(newSessionData);
      saveSessionData(newSessionData);
    }
    setSessionStartTime(loadedSessionData.sessionStartTime);

    // Load initial card stats for display on start screen
    if (loadedCards.length > 0) {
      setCardStats(getCardStats(loadedCards));
      setUpcomingReviews(getUpcomingReviews(loadedCards));
    }

    // Don't automatically select the first card - wait for user to start session
    // if (loadedCards.length > 0) {
    //   selectNextCard(loadedCards);
    // }
  }, []);

  const startSession = useCallback(() => {
    setSessionStarted(true);
    if (cards.length > 0) {
      selectNextCard(cards);
    }
  }, [cards, selectNextCard]);

  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // Don't handle shortcuts when modals are open
      if (showProgressDashboard || showStatistics || showSettings) return;

      // Handle session start
      if (!sessionStarted && e.key === "Enter") {
        e.preventDefault();
        startSession();
        return;
      }

      if (e.key === "Enter" && feedback.show) {
        e.preventDefault();
        selectNextCard(cards);
      }

      // Keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "p":
            e.preventDefault();
            setShowProgressDashboard(true);
            break;
          case "s":
            e.preventDefault();
            setShowStatistics(true);
            break;
          case "b":
            e.preventDefault();
            setShowSettings(true);
            break;
        }
      }

      // Escape key to close modals
      if (e.key === "Escape") {
        setShowProgressDashboard(false);
        setShowStatistics(false);
        setShowSettings(false);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyPress);
    return () => window.removeEventListener("keydown", handleGlobalKeyPress);
  }, [
    feedback.show,
    selectNextCard,
    cards,
    showProgressDashboard,
    showStatistics,
    showSettings,
    sessionStarted,
    startSession,
  ]);

  const handleSubmitAnswer = async () => {
    if (!currentCard || !questionStartTime || !sessionData || !settings) return;

    setIsSubmitting(true);
    setError(null);

    try {
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

      // Get the updated card based on the rating
      let updatedFsrsCard: Card;
      switch (rating) {
        case 1: // Again
          updatedFsrsCard = reviewRecord[Rating.Again].card;
          break;
        case 2: // Hard
          updatedFsrsCard = reviewRecord[Rating.Hard].card;
          break;
        case 3: // Good
          updatedFsrsCard = reviewRecord[Rating.Good].card;
          break;
        case 4: // Easy
          updatedFsrsCard = reviewRecord[Rating.Easy].card;
          break;
        default:
          updatedFsrsCard = reviewRecord[Rating.Good].card; // Default to Good
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
        lastReviewDate: now,
        sessionStartTime: sessionData.sessionStartTime,
        totalSessionTime: sessionData.totalSessionTime,
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
        userAnswer: userAnswerNum,
        rating: ratingNames[rating as keyof typeof ratingNames],
        responseTime: Math.round(responseTime),
      });

      // Play celebration sound for correct answers
      if (isCorrect) {
        playCelebrationSound();
      }
    } catch (err) {
      setError(
        `Failed to process answer: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      console.error("Error processing answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && userAnswer && !feedback.show) {
      handleSubmitAnswer();
    } else if (e.key === "Enter" && feedback.show) {
      e.preventDefault();
      selectNextCard(cards);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-lg text-gray-900 dark:text-white">
            Loading cards...
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Initializing your multiplication practice session
          </div>
        </div>
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4 mt-4">
            <button
              type="button"
              onClick={() => setShowProgressDashboard(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="View Progress (Ctrl/Cmd + P)"
            >
              📊 Progress
            </button>
            <button
              type="button"
              onClick={() => setShowStatistics(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              title="View Statistics (Ctrl/Cmd + S)"
            >
              📈 Statistics
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              title="Settings (Ctrl/Cmd + B)"
            >
              ⚙️ Settings
            </button>
          </div>
        </header>

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <title>Error</title>
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-xs text-red-600 dark:text-red-300 underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="max-w-4xl mx-auto">
          {/* Review Schedule Display */}
          {cardStats && upcomingReviews.length > 0 && settings?.showUpcomingReviews && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Upcoming Reviews
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center text-sm">
                {upcomingReviews.slice(0, 7).map((count, index) => {
                  const date = new Date();
                  date.setDate(date.getDate() + index);
                  const dayName = date.toLocaleDateString("en-US", {
                    weekday: "short",
                  });
                  const dayNumber = date.getDate();
                  const dayKey = `day-${index}-${dayNumber}`;

                  return (
                    <div
                      key={dayKey}
                      className="p-2 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {index === 0 ? "Today" : dayName}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {dayNumber}
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          count > 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Session Start Screen */}
          {!sessionStarted ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="mb-8">
                  <div className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                    Ready to Practice?
                  </div>
                  <div className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                    Press{" "}
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                      Enter
                    </kbd>{" "}
                    to start your multiplication practice session
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startSession}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg text-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Start Practice Session
                </button>

                <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                  {cardStats && (
                    <div>
                      {cardStats.due} cards due • {cardStats.new} new cards •{" "}
                      {cardStats.learning} learning
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            currentCard && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-2xl mx-auto">
                <div className="text-center">
                  {/* Question Display */}
                  <div className="mb-8">
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 font-mono">
                      <div className="text-right">{currentCard.multiplicand}</div>
                      <div className="text-right">x {currentCard.multiplier}</div>
                      <div className="border-t-4 border-gray-400 dark:border-gray-500 my-2"></div>
                      <div className="text-right">?</div>
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
                        className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center w-48 sm:w-56 lg:w-64 p-3 sm:p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                        placeholder="Your answer"
                        maxLength={5}
                      />
                      <div className="mt-4 flex justify-center">
                        <button
                          type="button"
                          onClick={handleSubmitAnswer}
                          disabled={!userAnswer || isSubmitting}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors flex items-center justify-center"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            "Submit"
                          )}
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
                        <div className="text-2xl text-gray-700 dark:text-gray-300 space-y-2">
                          <div>
                            Your answer:{" "}
                            <span className="font-bold text-red-600 dark:text-red-400">
                              {feedback.userAnswer}
                            </span>
                          </div>
                          <div>
                            Correct answer:{" "}
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {feedback.correctAnswer}
                            </span>
                          </div>
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

                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => selectNextCard(cards)}
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors"
                        >
                          Next
                        </button>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Press Enter or tap Next to continue
                      </div>
                    </div>
                  )}

                  {/* Stats Display */}
                  <div className="mt-8 text-sm text-gray-500 dark:text-gray-400 space-y-2">
                    {cardStats && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="font-semibold text-blue-600 dark:text-blue-400">
                            {cardStats.due}
                          </div>
                          <div>Due cards</div>
                        </div>
                        <div>
                          <div className="font-semibold text-green-600 dark:text-green-400">
                            {cardStats.new}
                          </div>
                          <div>New cards</div>
                        </div>
                        <div>
                          <div className="font-semibold text-yellow-600 dark:text-yellow-400">
                            {cardStats.learning}
                          </div>
                          <div>Learning</div>
                        </div>
                        <div>
                          <div className="font-semibold text-purple-600 dark:text-purple-400">
                            {cardStats.review}
                          </div>
                          <div>Review</div>
                        </div>
                      </div>
                    )}
                    {currentCard && (
                      <div className="text-center mt-4">
                        <div className="text-xs">
                          Card State:{" "}
                          {
                            ["New", "Learning", "Review", "Relearning"][
                              currentCard.fsrsCard.state
                            ]
                          }
                          {currentCard.fsrsCard.state !== 0 && (
                            <span className="ml-2">
                              • Interval:{" "}
                              {Math.round(currentCard.fsrsCard.elapsed_days)}d
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {sessionData && (
                      <div className="text-center space-y-1">
                        <div>
                          {sessionData.speedStats.isWarmedUp
                            ? `Warmed up (${sessionData.responses.length} responses)`
                            : `Warmup: ${sessionData.responses.length}/${settings?.warmupTarget || 50}`}
                        </div>
                        {sessionStartTime && (
                          <div className="text-xs">
                            Session started:{" "}
                            {sessionStartTime.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </main>
      </div>

      {/* Progress Dashboard Modal */}
      {sessionData && (
        <ProgressDashboard
          cards={cards}
          sessionData={sessionData}
          isVisible={showProgressDashboard}
          onClose={() => setShowProgressDashboard(false)}
        />
      )}

      {/* Statistics Modal */}
      {sessionData && showStatistics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Detailed Statistics
                </h2>
                <button
                  type="button"
                  onClick={() => setShowStatistics(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <StatisticsChart responses={sessionData.responses} />

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setShowStatistics(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Close Statistics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settings && (
        <Settings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onImportComplete={() => {
            // Reload all data after import
            const loadedCards = loadCards();
            const loadedSessionData = loadSessionData();
            const loadedSettings = loadSettings();
            setCards(loadedCards);
            setSessionData(loadedSessionData);
            setSettings(loadedSettings);
            if (loadedCards.length > 0) {
              selectNextCard(loadedCards);
            }
          }}
          settings={settings}
          onSettingsChange={(newSettings) => {
            setSettings(newSettings);
            saveSettings(newSettings);
          }}
        />
      )}
    </div>
  );
}
