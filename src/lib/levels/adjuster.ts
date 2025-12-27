/**
 * Level Adjustment System
 *
 * Handles the calculation and updating of user skill levels based on performance.
 * Uses a numeric scale (1.0-6.0) that maps to CEFR levels (A1-C2).
 */

import { CEFRLevel, SkillArea, QuestionType } from '../prompts/types';

// =====================================================
// TYPES
// =====================================================

export interface PerformanceData {
  overallScore: number;        // 0-100
  fluency?: number;
  grammar?: number;
  vocabulary?: number;
  coherence?: number;
  taskAchievement?: number;
  timeSpent?: number;          // seconds
}

export interface LevelAdjustmentResult {
  previousLevel: CEFRLevel;
  previousNumeric: number;
  newLevel: CEFRLevel;
  newNumeric: number;
  adjustment: number;
  attemptsAtLevel: number;
  correctStreak: number;
}

// =====================================================
// CONSTANTS
// =====================================================

// Thresholds for level adjustment
const EXCELLENT_THRESHOLD = 85;
const GOOD_THRESHOLD = 70;
const ADEQUATE_THRESHOLD = 55;
const STRUGGLING_THRESHOLD = 40;

// Adjustment amounts
const EXCELLENT_ADJUSTMENT = 0.15;
const GOOD_ADJUSTMENT = 0.05;
const ADEQUATE_ADJUSTMENT = 0.0;
const STRUGGLING_ADJUSTMENT = -0.05;
const POOR_ADJUSTMENT = -0.15;

// Bonus for consistent performance
const STREAK_BONUS_THRESHOLD = 5;
const STREAK_BONUS_AMOUNT = 0.05;

// Level bounds
const MIN_LEVEL = 1.0;  // A1
const MAX_LEVEL = 6.0;  // C2

// =====================================================
// CORE FUNCTIONS
// =====================================================

/**
 * Calculate the level adjustment based on performance score
 */
export function calculateLevelAdjustment(
  currentNumericLevel: number,
  performance: PerformanceData,
  attemptsAtLevel: number = 0,
  correctStreak: number = 0
): number {
  let adjustment = 0;

  // Base adjustment from overall score
  if (performance.overallScore >= EXCELLENT_THRESHOLD) {
    adjustment = EXCELLENT_ADJUSTMENT;
  } else if (performance.overallScore >= GOOD_THRESHOLD) {
    adjustment = GOOD_ADJUSTMENT;
  } else if (performance.overallScore >= ADEQUATE_THRESHOLD) {
    adjustment = ADEQUATE_ADJUSTMENT;
  } else if (performance.overallScore >= STRUGGLING_THRESHOLD) {
    adjustment = STRUGGLING_ADJUSTMENT;
  } else {
    adjustment = POOR_ADJUSTMENT;
  }

  // Streak bonus: if performing well consistently
  if (correctStreak >= STREAK_BONUS_THRESHOLD && performance.overallScore >= GOOD_THRESHOLD) {
    adjustment += STREAK_BONUS_AMOUNT;
  }

  // Stability factor: slower adjustments if at level for a while with adequate scores
  if (attemptsAtLevel >= 10 && performance.overallScore >= ADEQUATE_THRESHOLD && performance.overallScore < GOOD_THRESHOLD) {
    // User is stable at this level, reduce downward pressure
    adjustment = Math.max(0, adjustment);
  }

  return adjustment;
}

/**
 * Apply level adjustment and clamp to valid range
 */
export function applyLevelAdjustment(currentLevel: number, adjustment: number): number {
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, currentLevel + adjustment));
}

/**
 * Convert numeric level (1.0-6.0) to CEFR level
 */
export function numericToCEFR(numericLevel: number): CEFRLevel {
  if (numericLevel < 1.5) return 'A1';
  if (numericLevel < 2.5) return 'A2';
  if (numericLevel < 3.5) return 'B1';
  if (numericLevel < 4.5) return 'B2';
  if (numericLevel < 5.5) return 'C1';
  return 'C2';
}

/**
 * Convert CEFR level to numeric level (center of range)
 */
export function cefrToNumeric(cefrLevel: CEFRLevel): number {
  switch (cefrLevel) {
    case 'A1': return 1.0;
    case 'A2': return 2.0;
    case 'B1': return 3.0;
    case 'B2': return 4.0;
    case 'C1': return 5.0;
    case 'C2': return 6.0;
    default: return 2.0; // Default to A2
  }
}

/**
 * Get adjacent CEFR levels (for fallback prompt selection)
 */
export function getAdjacentLevels(level: CEFRLevel): CEFRLevel[] {
  const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const index = levels.indexOf(level);

  const adjacent: CEFRLevel[] = [];
  if (index > 0) adjacent.push(levels[index - 1]);
  if (index < levels.length - 1) adjacent.push(levels[index + 1]);

  return adjacent;
}

/**
 * Determine if user should level up based on performance trend
 */
export function shouldLevelUp(
  currentLevel: CEFRLevel,
  correctStreak: number,
  recentScores: number[]
): boolean {
  if (currentLevel === 'C2') return false; // Already max

  // Need at least 5 exercises to evaluate
  if (recentScores.length < 5) return false;

  // Average of last 5 scores should be excellent
  const avgScore = recentScores.slice(-5).reduce((a, b) => a + b, 0) / 5;

  return avgScore >= EXCELLENT_THRESHOLD && correctStreak >= STREAK_BONUS_THRESHOLD;
}

/**
 * Determine if user should level down based on performance trend
 */
export function shouldLevelDown(
  currentLevel: CEFRLevel,
  recentScores: number[]
): boolean {
  if (currentLevel === 'A1') return false; // Already min

  // Need at least 5 exercises to evaluate
  if (recentScores.length < 5) return false;

  // Average of last 5 scores should be struggling
  const avgScore = recentScores.slice(-5).reduce((a, b) => a + b, 0) / 5;

  return avgScore < STRUGGLING_THRESHOLD;
}

/**
 * Calculate overall skill level across all question types in a skill area
 */
export function calculateOverallSkillLevel(
  questionTypeLevels: { questionType: QuestionType; numericLevel: number }[]
): { cefrLevel: CEFRLevel; numericLevel: number } {
  if (questionTypeLevels.length === 0) {
    return { cefrLevel: 'A2', numericLevel: 2.0 };
  }

  const avgNumeric = questionTypeLevels.reduce((sum, qt) => sum + qt.numericLevel, 0) / questionTypeLevels.length;

  return {
    cefrLevel: numericToCEFR(avgNumeric),
    numericLevel: Math.round(avgNumeric * 100) / 100
  };
}

/**
 * Get level progress within current CEFR band (0-100%)
 */
export function getLevelProgress(numericLevel: number): number {
  const decimal = numericLevel - Math.floor(numericLevel);
  return Math.round(decimal * 100);
}

/**
 * Format level for display
 */
export function formatLevel(cefrLevel: CEFRLevel, numericLevel: number): string {
  const progress = getLevelProgress(numericLevel);
  return `${cefrLevel} (${progress}%)`;
}
