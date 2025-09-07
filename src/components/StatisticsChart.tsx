import type { ResponseRecord } from "@/lib/types";

interface StatisticsChartProps {
  responses: ResponseRecord[];
}

export default function StatisticsChart({ responses }: StatisticsChartProps) {
  // Group responses by day for trend analysis
  const groupResponsesByDay = (responses: ResponseRecord[]) => {
    const groups = new Map<
      string,
      { correct: number; total: number; avgTime: number; times: number[] }
    >();

    responses.forEach((response) => {
      const day = new Date(response.timestamp).toDateString();
      const existing = groups.get(day) || {
        correct: 0,
        total: 0,
        avgTime: 0,
        times: [],
      };

      existing.total += 1;
      if (response.correct) existing.correct += 1;
      existing.times.push(response.responseTime);

      groups.set(day, existing);
    });

    // Calculate average times
    groups.forEach((value) => {
      value.avgTime =
        value.times.reduce((a, b) => a + b, 0) / value.times.length;
    });

    return Array.from(groups.entries())
      .map(([day, stats]) => ({
        day,
        accuracy: (stats.correct / stats.total) * 100,
        avgTime: Math.round(stats.avgTime),
        total: stats.total,
      }))
      .slice(-7); // Last 7 days
  };

  // Get recent performance trends
  const dailyStats = groupResponsesByDay(responses);
  const maxResponseTime = Math.max(...dailyStats.map((d) => d.avgTime), 1);

  if (responses.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Performance Trends
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No data available yet. Start practicing to see your progress!
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Performance Trends (Last 7 Days)
      </h3>

      {dailyStats.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
          Practice more to see daily trends
        </div>
      ) : (
        <div className="space-y-4">
          {/* Accuracy Trend */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Daily Accuracy
            </h4>
            <div className="space-y-2">
              {dailyStats.map((stat) => (
                <div key={stat.day} className="flex items-center space-x-3">
                  <div className="w-16 text-xs text-gray-600 dark:text-gray-400">
                    {new Date(stat.day).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "numeric",
                      day: "numeric",
                    })}
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-4 relative">
                    <div
                      className="bg-green-500 h-4 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(stat.accuracy, 5)}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {Math.round(stat.accuracy)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-12 text-xs text-gray-600 dark:text-gray-400 text-right">
                    {stat.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Response Time Trend */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Average Response Time
            </h4>
            <div className="space-y-2">
              {dailyStats.map((stat) => (
                <div
                  key={`time-${stat.day}`}
                  className="flex items-center space-x-3"
                >
                  <div className="w-16 text-xs text-gray-600 dark:text-gray-400">
                    {new Date(stat.day).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "numeric",
                      day: "numeric",
                    })}
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-4 relative">
                    <div
                      className="bg-blue-500 h-4 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.max((stat.avgTime / maxResponseTime) * 100, 10)}%`,
                      }}
                    >
                      <span className="text-xs text-white font-medium">
                        {stat.avgTime}ms
                      </span>
                    </div>
                  </div>
                  <div className="w-12 text-xs text-gray-600 dark:text-gray-400 text-right">
                    {stat.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Session Summary */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recent Performance Summary
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white dark:bg-gray-800 rounded p-2">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {dailyStats.length > 0
                    ? Math.round(dailyStats[dailyStats.length - 1].accuracy)
                    : 0}
                  %
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Latest Accuracy
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded p-2">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {dailyStats.length > 0
                    ? dailyStats[dailyStats.length - 1].avgTime
                    : 0}
                  ms
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Latest Avg Time
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded p-2">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {dailyStats.reduce((sum, stat) => sum + stat.total, 0)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Total Responses
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
