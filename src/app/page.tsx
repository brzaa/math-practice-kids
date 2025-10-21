"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FSRS, type Grade, Rating } from "ts-fsrs";
import CelebrationOverlay from "@/components/CelebrationOverlay";
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
  regenerateDeck,
  saveCards,
  saveSessionData,
  saveSettings,
} from "@/lib/storage";
import {
  type AppSettings,
  type ArithmeticCard,
  evaluateCard,
  formatQuestion,
  isCorrect as isAnswerCorrect,
  type SessionData,
} from "@/lib/types";

export default function Home() {
  const [cards, setCards] = useState<ArithmeticCard[]>([]);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentCard, setCurrentCard] = useState<ArithmeticCard | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    show: boolean;
    correct: boolean;
    correctAnswer?: number;
    userAnswer?: number;
    rating?: string;
    responseTime?: number;
  }>({ show: false, correct: false });
  const [needsCorrection, setNeedsCorrection] = useState(false);
  const [correctionAnswer, setCorrectionAnswer] = useState("");
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
  const [timedRoundActive, setTimedRoundActive] = useState(false);
  const [timedRoundSecondsRemaining, setTimedRoundSecondsRemaining] =
    useState(0);
  const [timedRoundCorrectCount, setTimedRoundCorrectCount] = useState(0);
  const [timedRoundSummary, setTimedRoundSummary] = useState<{
    correct: number;
    duration: number;
  } | null>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [celebration, setCelebration] = useState<{ message: string } | null>(
    null,
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const correctionInputRef = useRef<HTMLInputElement>(null);
  const timedRoundTimerRef = useRef<ReturnType<
    typeof window.setInterval
  > | null>(null);
  const timedRoundCorrectRef = useRef(0);
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

  const selectNextCard = useCallback((cardList: ArithmeticCard[]) => {
    const nextCard = getNextCard(cardList);
    if (!nextCard) return;

    setCurrentCard(nextCard);
    setQuestionStartTime(performance.now());
    setFeedback({ show: false, correct: false });
    setUserAnswer("");
    setNeedsCorrection(false);
    setCorrectionAnswer("");

    // Update card stats and upcoming reviews
    setCardStats(getCardStats(cardList));
    setUpcomingReviews(getUpcomingReviews(cardList));

    // Focus input after a brief delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    const loadedSettings = loadSettings();
    const loadedCards = loadCards(loadedSettings);
    const loadedSessionData = loadSessionData();

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
    setStreakCount(0);
    if (cards.length > 0) {
      selectNextCard(cards);
    }
  }, [cards, selectNextCard]);

  const triggerCelebration = useCallback((message: string) => {
    setCelebration({ message });
  }, []);

  const dismissCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  const finishTimedRound = useCallback(
    (options: { cancelled?: boolean } = {}) => {
      if (timedRoundTimerRef.current) {
        clearInterval(timedRoundTimerRef.current);
        timedRoundTimerRef.current = null;
      }

      const wasCancelled = options.cancelled ?? false;
      const duration = settings?.timedChallengeDuration ?? 60;
      const correctCount = timedRoundCorrectRef.current;

      setTimedRoundActive(false);
      setTimedRoundSecondsRemaining(0);
      setTimedRoundCorrectCount(0);
      timedRoundCorrectRef.current = 0;

      if (wasCancelled) {
        setTimedRoundSummary(null);
      } else {
        setTimedRoundSummary({
          correct: correctCount,
          duration,
        });
      }
    },
    [settings?.timedChallengeDuration],
  );

  const startTimedRound = useCallback(() => {
    if (!settings?.timedChallengeEnabled) {
      return;
    }

    if (!sessionStarted) {
      startSession();
    }

    if (timedRoundTimerRef.current) {
      clearInterval(timedRoundTimerRef.current);
      timedRoundTimerRef.current = null;
    }

    const duration = settings.timedChallengeDuration;
    setTimedRoundSummary(null);
    setTimedRoundCorrectCount(0);
    timedRoundCorrectRef.current = 0;
    setTimedRoundSecondsRemaining(duration);
    setTimedRoundActive(true);
  }, [
    sessionStarted,
    settings?.timedChallengeEnabled,
    settings?.timedChallengeDuration,
    startSession,
  ]);

  const cancelTimedRound = useCallback(() => {
    finishTimedRound({ cancelled: true });
  }, [finishTimedRound]);

  useEffect(() => {
    timedRoundCorrectRef.current = timedRoundCorrectCount;
  }, [timedRoundCorrectCount]);

  useEffect(() => {
    if (!timedRoundActive) {
      if (timedRoundTimerRef.current) {
        clearInterval(timedRoundTimerRef.current);
        timedRoundTimerRef.current = null;
      }
      return;
    }

    timedRoundTimerRef.current = window.setInterval(() => {
      setTimedRoundSecondsRemaining((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timedRoundTimerRef.current) {
        clearInterval(timedRoundTimerRef.current);
        timedRoundTimerRef.current = null;
      }
    };
  }, [timedRoundActive]);

  useEffect(() => {
    if (timedRoundActive && timedRoundSecondsRemaining <= 0) {
      finishTimedRound();
    }
  }, [timedRoundActive, timedRoundSecondsRemaining, finishTimedRound]);

  useEffect(() => {
    if (!settings?.timedChallengeEnabled && timedRoundActive) {
      finishTimedRound({ cancelled: true });
    }
  }, [settings?.timedChallengeEnabled, timedRoundActive, finishTimedRound]);

  useEffect(() => {
    if (!timedRoundSummary) return;

    const target = Math.max(5, Math.floor(timedRoundSummary.duration / 6));
    if (timedRoundSummary.correct >= target) {
      triggerCelebration(
        `Amazing! ${timedRoundSummary.correct} correct in ${timedRoundSummary.duration}s!`,
      );
    }
  }, [timedRoundSummary, triggerCelebration]);

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

      if (e.key === "Enter" && feedback.show && !needsCorrection) {
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
    needsCorrection,
  ]);

  const handleSubmitAnswer = async () => {
    if (!currentCard || questionStartTime === null || !sessionData || !settings)
      return;

    const trimmedAnswer = userAnswer.trim();
    if (trimmedAnswer === "" || trimmedAnswer === "-") {
      setError("Please enter an answer before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const responseTime = performance.now() - questionStartTime;
      const userAnswerNum = Number.parseInt(trimmedAnswer, 10);

      if (Number.isNaN(userAnswerNum)) {
        setError("Please enter a valid number.");
        return;
      }

      const correctAnswer = evaluateCard(currentCard);
      const correct = isAnswerCorrect(currentCard, userAnswerNum);

      const newSpeedStats = updateSpeedStats(
        sessionData.speedStats,
        responseTime,
        settings.warmupTarget,
      );

      const rating = calculateGrade(correct, responseTime, newSpeedStats);

      const responseRecord = createResponseRecord(
        currentCard.id,
        userAnswerNum,
        correctAnswer,
        responseTime,
      );

      const now = new Date();
      const reviewRecord = fsrs.repeat(currentCard.fsrsCard, now);
      const updatedFsrsCard = reviewRecord[rating].card;

      const updatedCards = cards.map((card) =>
        card.id === currentCard.id
          ? { ...card, fsrsCard: updatedFsrsCard }
          : card,
      );

      const newSessionData: SessionData = {
        responses: [...sessionData.responses, responseRecord],
        speedStats: newSpeedStats,
        lastReviewDate: now,
        sessionStartTime: sessionData.sessionStartTime,
        totalSessionTime: sessionData.totalSessionTime,
      };

      setCards(updatedCards);
      setSessionData(newSessionData);
      saveCards(updatedCards);
      saveSessionData(newSessionData);

      const ratingLabels: Record<Grade, string> = {
        [Rating.Again]: "Again",
        [Rating.Hard]: "Hard",
        [Rating.Good]: "Good",
        [Rating.Easy]: "Easy",
      };

      if (correct && timedRoundActive) {
        setTimedRoundCorrectCount((prev) => prev + 1);
      }

      setFeedback({
        show: true,
        correct,
        correctAnswer,
        userAnswer: userAnswerNum,
        rating: ratingLabels[rating],
        responseTime: Math.round(responseTime),
      });

      if (correct) {
        setStreakCount((prev) => {
          const next = prev + 1;
          if (next === 5 || next % 10 === 0) {
            triggerCelebration(`🔥 ${next}-answer streak!`);
          }
          return next;
        });
        playCelebrationSound();
      } else {
        setStreakCount(0);
        setNeedsCorrection(true);
        setTimeout(() => {
          correctionInputRef.current?.focus();
          correctionInputRef.current?.select();
        }, 100);
      }
    } catch (err) {
      setError(
        `Failed to process answer: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
      console.error("Error processing answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isAnswerReady && !feedback.show) {
      handleSubmitAnswer();
    } else if (e.key === "Enter" && feedback.show && !needsCorrection) {
      e.preventDefault();
      selectNextCard(cards);
    }
  };

  const handleCorrectionKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && needsCorrection && isCorrectionReady) {
      handleCorrectionSubmit();
    }
  };

  const handleCorrectionSubmit = () => {
    if (!currentCard || !needsCorrection) return;

    const trimmed = correctionAnswer.trim();
    if (trimmed === "" || trimmed === "-") {
      return;
    }

    const userCorrectionNum = Number.parseInt(trimmed, 10);
    if (Number.isNaN(userCorrectionNum)) {
      return;
    }

    if (isAnswerCorrect(currentCard, userCorrectionNum)) {
      setNeedsCorrection(false);
      setCorrectionAnswer("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^-?\d*$/.test(value)) {
      setUserAnswer(value);
    }
  };

  const handleCorrectionInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    if (value === "" || /^-?\d*$/.test(value)) {
      setCorrectionAnswer(value);
    }
  };

  const isAnswerReady = userAnswer.trim() !== "" && userAnswer.trim() !== "-";
  const isCorrectionReady =
    correctionAnswer.trim() !== "" && correctionAnswer.trim() !== "-";

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-lg text-gray-900 dark:text-white">
            Loading cards...
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Initializing your math practice session
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
            Math Facts Practice
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Master addition and subtraction with spaced repetition
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
          {cardStats &&
            upcomingReviews.length > 0 &&
            settings?.showUpcomingReviews && (
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
                    to start your practice session
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

                {settings?.timedChallengeEnabled && (
                  <div className="mt-8 text-left border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Timed Challenge
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Try to solve as many problems as you can in{" "}
                      {settings.timedChallengeDuration} seconds. Perfect for a
                      quick warmup burst!
                    </p>
                    <button
                      type="button"
                      onClick={startTimedRound}
                      className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                      Start Timed Round
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            currentCard && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-2xl mx-auto">
                <div className="text-center">
                  {settings?.timedChallengeEnabled && (
                    <div className="mb-6 space-y-4">
                      {timedRoundActive ? (
                        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="text-left">
                              <div className="text-xs uppercase tracking-wide text-purple-600 dark:text-purple-300 font-semibold">
                                Timed Round
                              </div>
                              <div className="text-3xl font-extrabold text-purple-800 dark:text-purple-100">
                                {Math.max(timedRoundSecondsRemaining, 0)}s left
                              </div>
                              <div className="text-sm text-purple-700 dark:text-purple-200">
                                Correct so far: {timedRoundCorrectCount}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={cancelTimedRound}
                              className="self-start sm:self-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                            >
                              End Round
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
                            <div>
                              <div className="text-xs uppercase tracking-wide text-purple-600 dark:text-purple-300 font-semibold">
                                Timed Challenge
                              </div>
                              <div className="text-lg font-semibold text-purple-800 dark:text-purple-100">
                                Ready for a {settings.timedChallengeDuration}
                                -second sprint?
                              </div>
                              {timedRoundSummary && (
                                <div className="text-sm text-purple-700 dark:text-purple-200 mt-1">
                                  Last round: {timedRoundSummary.correct}{" "}
                                  correct in {timedRoundSummary.duration}{" "}
                                  seconds.
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {timedRoundSummary && (
                                <button
                                  type="button"
                                  onClick={() => setTimedRoundSummary(null)}
                                  className="bg-white dark:bg-purple-800/60 border border-purple-200 dark:border-purple-600 text-purple-700 dark:text-purple-100 font-semibold py-2 px-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                                >
                                  Dismiss
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={startTimedRound}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                              >
                                Start Timed Round
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question Display */}
                  <div className="mb-8 space-y-3">
                    <div className="text-sm uppercase tracking-wide text-blue-600 dark:text-blue-300 font-semibold">
                      {currentCard.operation === "addition"
                        ? "Addition"
                        : "Subtraction"}
                    </div>
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white font-mono">
                      {formatQuestion(currentCard)} = ?
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
                          disabled={!isAnswerReady || isSubmitting}
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

                      {needsCorrection ? (
                        <div className="mt-6">
                          <div className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                            Please enter the correct answer to continue:
                          </div>
                          <input
                            ref={correctionInputRef}
                            type="text"
                            value={correctionAnswer}
                            onChange={handleCorrectionInputChange}
                            onKeyPress={handleCorrectionKeyPress}
                            className="text-xl font-bold text-center w-32 p-3 border-2 border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                            placeholder="Answer"
                            maxLength={5}
                          />
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={handleCorrectionSubmit}
                              disabled={!isCorrectionReady}
                              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                            >
                              Submit Correction
                            </button>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Press Enter to submit the correct answer
                          </p>
                        </div>
                      ) : (
                        <div className="text-lg text-gray-600 dark:text-gray-400 mt-4">
                          {feedback.correct ? "Great job!" : "Keep practicing!"}
                        </div>
                      )}

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

                      {!needsCorrection && (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => selectNextCard(cards)}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors"
                          >
                            Next
                          </button>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Press Enter or tap Next to continue
                          </div>
                        </div>
                      )}
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
                            : `Warmup: ${sessionData.responses.length}/${
                                settings?.warmupTarget || 50
                              }`}
                        </div>
                        {sessionStartTime && (
                          <div className="text-xs">
                            Session started:{" "}
                            {sessionStartTime.toLocaleTimeString()}
                          </div>
                        )}
                        {streakCount > 0 && (
                          <div className="text-xs text-purple-600 dark:text-purple-300">
                            Current streak: {streakCount}
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

      {celebration && (
        <CelebrationOverlay
          visible
          message={celebration.message}
          onComplete={dismissCelebration}
        />
      )}

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
            finishTimedRound({ cancelled: true });
            dismissCelebration();
            setStreakCount(0);
            const loadedSettings = loadSettings();
            const loadedCards = loadCards(loadedSettings);
            const loadedSessionData = loadSessionData();
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
          onDeckRegenerate={(updatedSettings) => {
            setSettings(updatedSettings);
            saveSettings(updatedSettings);
            finishTimedRound({ cancelled: true });
            dismissCelebration();
            setStreakCount(0);
            const refreshedCards = regenerateDeck(updatedSettings);
            setCards(refreshedCards);
            const refreshedSession = loadSessionData();
            setSessionData(refreshedSession);
            setSessionStartTime(refreshedSession.sessionStartTime);
            setCardStats(getCardStats(refreshedCards));
            setUpcomingReviews(getUpcomingReviews(refreshedCards));
            setCurrentCard(null);
            setFeedback({ show: false, correct: false });
            setUserAnswer("");
            setCorrectionAnswer("");
            setNeedsCorrection(false);
            setQuestionStartTime(null);
            setSessionStarted(false);
            setError(null);
          }}
        />
      )}
    </div>
  );
}
