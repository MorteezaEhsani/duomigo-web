'use client';

import React from 'react';
import { motion } from 'framer-motion';

type WeeklyStreakProps = {
  weekStart?: 'sun' | 'mon';
  currentDayIndex: number;
  progress: number;
  streakDays: number;
  goalLabel?: string;
  className?: string;
};

export default function WeeklyStreak({
  weekStart = 'sun',
  currentDayIndex,
  progress,
  streakDays,
  goalLabel = 'Complete 2 practices',
  className = '',
}: WeeklyStreakProps) {
  // Define weekdays based on start preference
  const weekdaysSun = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weekdaysMon = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weekdays = weekStart === 'sun' ? weekdaysSun : weekdaysMon;
  
  // Ensure progress is between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const progressPercentage = Math.round(clampedProgress * 100);
  
  // ARIA label for accessibility
  const ariaLabel = `Weekly streak progress: ${streakDays}-day streak, ${progressPercentage}% of weekly goal completed. Current day: ${weekdays[currentDayIndex]}`;

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-lg p-6 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${className}`}
      tabIndex={0}
      role="progressbar"
      aria-valuenow={progressPercentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      {/* Header with goal label */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-600">
          {goalLabel}
        </h3>
      </div>

      {/* Weekday labels */}
      <div className="flex justify-between mb-3 px-1">
        {weekdays.map((day, index) => (
          <span
            key={index}
            className={`text-xs font-semibold transition-colors duration-200 ${
              index === currentDayIndex
                ? 'text-amber-500'
                : 'text-gray-500'
            }`}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Progress rail and bar */}
      <div className="relative h-12">
        {/* Background rail */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 rounded-full" style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)' }} />
        
        {/* Animated progress bar */}
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-8 rounded-full overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress * 100}%` }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 15,
            duration: 0.6,
          }}
        >
          {/* Gradient fill with glossy effect */}
          <div className="relative w-full h-full bg-gradient-to-r from-amber-400 to-amber-500">
            {/* Glossy inner stripe */}
            <div className="absolute inset-x-0 top-1 h-2 bg-gradient-to-b from-white/30 to-transparent rounded-full mx-1" />
          </div>
        </motion.div>

        {/* Flame badge positioned at the end of progress */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center"
          initial={{ left: 0 }}
          animate={{ left: `calc(${clampedProgress * 100}% - 1.5rem)` }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 15,
            duration: 0.6,
          }}
        >
          <div className="relative flex items-center justify-center">
            {/* Fire emoji with streak number */}
            <div className="flex items-center bg-white rounded-full px-3 py-1 shadow-lg border border-gray-200">
              <span className="text-2xl mr-1">🔥</span>
              <span className="font-bold text-gray-900 text-sm">
                {streakDays}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Progress text */}
      <div className="mt-4 flex justify-between items-center">
        <span className="text-sm text-gray-600">
          {progressPercentage}% complete
        </span>
        <span className="text-sm font-semibold text-amber-500">
          {streakDays} day{streakDays !== 1 ? 's' : ''} 🔥
        </span>
      </div>
    </div>
  );
}