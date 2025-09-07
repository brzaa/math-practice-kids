import { getCardStats } from "@/lib/scheduler";
import type { MultiplicationCard, SessionData } from "@/lib/types";

interface ProgressDashboardProps {
  cards: MultiplicationCard[];
  sessionData: SessionData;
  isVisible: boolean;
  onClose: () => void;
}

export default function ProgressDashboard({
  cards,
  sessionData,
  isVisible,
  onClose,
}: ProgressDashboardProps) {
  if (!isVisible) return null;

  const cardStats = getCardStats(cards);
  const totalCards = cards.length;
  const completedCards = cardStats.review;
  const progressPercentage = Math.round((completedCards / totalCards) * 100);

  // Calculate accuracy statistics
  const totalResponses = sessionData.responses.length;
  const correctResponses = sessionData.responses.filter(
    (r) => r.correct,
  ).length;
  const accuracyPercentage =
    totalResponses > 0
      ? Math.round((correctResponses / totalResponses) * 100)
      : 0;

  // Recent performance (last 20 responses)
  const recentResponses = sessionData.responses.slice(-20);
  const recentCorrect = recentResponses.filter((r) => r.correct).length;
  const recentAccuracy =
    recentResponses.length > 0
      ? Math.round((recentCorrect / recentResponses.length) * 100)
      : 0;

  // Calculate average response time for correct answers
  const correctResponseTimes = sessionData.responses
    .filter((r) => r.correct)
    .map((r) => r.responseTime);
  const averageResponseTime =
    correctResponseTimes.length > 0
      ? Math.round(
          correctResponseTimes.reduce((a, b) => a + b, 0) /
            correctResponseTimes.length,
        )
      : 0;

  // Speed distribution (if warmed up)
  const speedStats = sessionData.speedStats;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Progress Dashboard
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Overall Progress */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Overall Progress
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-300">
                      Cards Mastered
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {completedCards} / {totalCards} ({progressPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white dark:bg-gray-800 rounded p-3">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {cardStats.due}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Due Today
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded p-3">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {cardStats.new}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      New Cards
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accuracy Statistics */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Accuracy Statistics
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-300">
                      Overall Accuracy
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {accuracyPercentage}% ({correctResponses}/{totalResponses}
                      )
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${accuracyPercentage}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-300">
                      Recent Accuracy (Last 20)
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {recentAccuracy}% ({recentCorrect}/
                      {recentResponses.length})
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        recentAccuracy >= accuracyPercentage
                          ? "bg-green-500"
                          : "bg-yellow-500"
                      }`}
                      style={{ width: `${recentAccuracy}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Speed Statistics */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Speed Performance
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Average Response Time
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {averageResponseTime}ms
                  </span>
                </div>

                {speedStats.isWarmedUp && (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Speed Percentiles:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>Fast (25th):</span>
                        <span>{Math.round(speedStats.percentiles.p25)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Good (50th):</span>
                        <span>{Math.round(speedStats.percentiles.p50)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Slow (75th):</span>
                        <span>{Math.round(speedStats.percentiles.p75)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Very Slow (90th):</span>
                        <span>{Math.round(speedStats.percentiles.p90)}ms</span>
                      </div>
                    </div>
                  </div>
                )}

                {!speedStats.isWarmedUp && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Speed grading activates after{" "}
                    {50 - sessionData.responses.length} more responses
                  </div>
                )}
              </div>
            </div>

            {/* Session Information */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Session Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Total Responses
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {totalResponses}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Session Started
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {sessionData.sessionStartTime.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Last Review
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {sessionData.lastReviewDate.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card State Distribution */}
          <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Card State Distribution
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-white dark:bg-gray-800 rounded p-4">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {cardStats.new}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  New Cards
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {Math.round((cardStats.new / totalCards) * 100)}%
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded p-4">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {cardStats.learning}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Learning
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {Math.round((cardStats.learning / totalCards) * 100)}%
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded p-4">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {cardStats.review}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Review
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {Math.round((cardStats.review / totalCards) * 100)}%
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded p-4">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {cardStats.due}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Due Today
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {Math.round((cardStats.due / totalCards) * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Continue Studying
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
