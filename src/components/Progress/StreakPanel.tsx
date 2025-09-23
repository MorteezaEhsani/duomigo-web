'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  formatDateISO,
  getWeekDates,
  getDayStatus,
  getDayNumber,
  getWeekdayInitials
} from './utils';

type ProgressResponse = {
  days: Array<{ date: string; count: number }>;
  totalQuestions: number;
  currentStreakWeeks: number;
  bestStreakDays: number;
  currentStreakDays: number;
};

export default function StreakPanel() {
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/progress');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch progress (${response.status})`);
      }

      const result: ProgressResponse = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching progress:', err);
      setError('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-14 w-14 bg-gray-200 rounded-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <p className="text-red-600">{error || 'No data available'}</p>
      </div>
    );
  }

  const today = formatDateISO(new Date());
  const completedDays = new Set(
    data.days.filter(d => d.count > 0).map(d => d.date)
  );
  const weekDates = getWeekDates(currentWeekOffset);
  const weekdayInitials = getWeekdayInitials();

  const handleWeekChange = (offset: number) => {
    if (offset >= 0 && offset < 12) {
      setCurrentWeekOffset(offset);
    }
  };

  // Calculate week label
  const getWeekLabel = (offset: number): string => {
    if (offset === 0) return 'This Week';
    if (offset === 1) return 'Last Week';
    return `${offset} Weeks Ago`;
  };

  // Get date range for current week view
  const getWeekDateRange = (dates: string[]): string => {
    if (dates.length === 0) return '';
    const firstDate = new Date(dates[0]);
    const lastDate = new Date(dates[dates.length - 1]);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    const firstFormatted = firstDate.toLocaleDateString('en-US', options);
    const lastFormatted = lastDate.toLocaleDateString('en-US', options);

    // If same month, show as "Nov 18 - 24"
    if (firstDate.getMonth() === lastDate.getMonth()) {
      return `${firstFormatted} - ${lastDate.getDate()}`;
    }
    // If different months, show as "Nov 28 - Dec 4"
    return `${firstFormatted} - ${lastFormatted}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          Your streak
        </h2>
        {/* Current Streak Badge */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 bg-amber-50 rounded-full">
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 23c-2.8 0-5.2-1-7.1-2.9S2 15.8 2 13c0-1.5.3-2.9.9-4.2.6-1.3 1.4-2.5 2.4-3.6L12 0l6.7 5.2c1 1.1 1.8 2.3 2.4 3.6.6 1.3.9 2.7.9 4.2 0 2.8-1 5.2-2.9 7.1S14.8 23 12 23zm0-2c2.2 0 4.1-.8 5.7-2.3 1.5-1.6 2.3-3.5 2.3-5.7 0-1.2-.2-2.3-.7-3.3-.5-1-1.1-2-1.9-2.8L12 3.5 6.6 6.9c-.8.8-1.4 1.8-1.9 2.8-.5 1-.7 2.1-.7 3.3 0 2.2.8 4.1 2.3 5.7C7.9 20.2 9.8 21 12 21z"/>
          </svg>
          <span className="text-xs sm:text-sm font-semibold text-amber-900">
            {data.currentStreakWeeks} {data.currentStreakWeeks === 1 ? 'Week' : 'Weeks'}
          </span>
        </div>
      </div>

      {/* Week Label and Date Range */}
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        <div className="text-sm sm:text-base font-medium text-gray-700">
          {getWeekLabel(currentWeekOffset)}
        </div>
        <div className="text-xs sm:text-sm text-gray-500">
          {getWeekDateRange(weekDates)}
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {weekdayInitials.map((day, i) => (
          <div key={i} className="flex justify-center items-center text-[10px] sm:text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Day Pills */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentWeekOffset}
          initial={{ opacity: 0, x: currentWeekOffset > 0 ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: currentWeekOffset > 0 ? 20 : -20 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-7 gap-1 sm:gap-2 mb-3"
        >
          {weekDates.map((date) => {
            const status = getDayStatus(date, today, completedDays);
            const dayNum = getDayNumber(date);
            const isToday = date === today;

            return (
              <div key={date} className="flex justify-center">
                <div
                  className={`
                    relative flex items-center justify-center rounded-full
                    font-medium text-xs sm:text-sm transition-all duration-200
                    ${status === 'completed'
                      ? 'bg-amber-500 text-white'
                      : status === 'today'
                      ? completedDays.has(date)
                        ? 'bg-amber-500 text-white'
                        : 'border-2 border-amber-500 text-gray-900'
                      : status === 'missed'
                      ? 'border border-gray-300 text-gray-600'
                      : status === 'future'
                      ? 'bg-gray-100 text-gray-400 opacity-40 cursor-not-allowed'
                      : 'border border-gray-300 text-gray-900'
                    }
                    w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14
                  `}
                >
                  {dayNum}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-2 sm:mb-3">
        {[...Array(12)].map((_, i) => (
          <button
            key={i}
            onClick={() => handleWeekChange(i)}
            className={`
              w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-200
              ${i === currentWeekOffset
                ? 'bg-amber-500 w-4 sm:w-6'
                : 'bg-gray-300 hover:bg-gray-400'
              }
            `}
            aria-label={`Week ${i + 1}`}
          />
        ))}
      </div>

      {/* Bottom Stats */}
      <div className="flex justify-between items-center">
        {/* Best Streak Badge */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 bg-purple-50 rounded-full">
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span className="text-xs sm:text-sm font-semibold text-purple-900">
            Best: {data.bestStreakDays} {data.bestStreakDays === 1 ? 'Day' : 'Days'}
          </span>
        </div>

        {/* Total Questions Stat */}
        <div className="text-xs sm:text-sm text-gray-600">
          <span className="font-semibold text-gray-900">
            {data.totalQuestions.toLocaleString()}
          </span>
          {' '}questions
        </div>
      </div>
    </div>
  );
}