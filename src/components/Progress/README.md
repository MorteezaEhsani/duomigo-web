# Strava-Style Streak Panel Component

A Strava-inspired progress tracking component for Duomigo that displays weekly streaks, daily practice indicators, and total question count.

## Features

- **Flame Badge**: Shows consecutive weeks with at least 1 practice session
- **Week View**: 7-day pill display (Monday-Sunday) with different states:
  - Completed days: Filled with amber color
  - Today: Special ring indicator (even if not yet completed)
  - Missed past days: Border only
  - Future days: Muted/disabled appearance
- **Week Pagination**: Navigate through the last 12 weeks with dot indicators
- **Total Questions**: Display of all-time practice count
- **Smooth Animations**: Week transitions using Framer Motion

## Installation

Component is already integrated into the dashboard. No additional setup required.

## Usage

```tsx
import StreakPanel from '@/components/Progress/StreakPanel';

// In your component
<StreakPanel />
```

## API Endpoint

The component fetches data from `/api/progress` which returns:

```typescript
type ProgressResponse = {
  days: Array<{ date: string; count: number }>;  // Last 12 weeks of daily data
  totalQuestions: number;                         // All-time total
  currentStreakWeeks: number;                     // Consecutive active weeks
};
```

## Database Requirements

Requires a `practice_sessions` table with:
- `id` (uuid)
- `user_id` (uuid)
- `completed_at` (timestamptz)
- `question_id` (text, nullable)

## Timezone Handling

- Uses user's local timezone for date calculations
- Week starts on Monday (matching Strava's convention)
- Today detection uses client-side `new Date()`

## Styling

Uses CSS variables with Tailwind fallbacks:
- `--brand`: Primary color (amber-500)
- `--brand-strong`: High contrast text
- `--muted`: Muted backgrounds
- `--ring`: Today's ring indicator

## Keyboard Navigation

- Pagination dots are keyboard accessible
- Week changes animated with directional transitions

## Testing

The component includes pure functions in `utils.ts` for unit testing:
- `getMondayOfWeek()`: Get Monday of any week
- `formatDateISO()`: Format dates as YYYY-MM-DD
- `getDayStatus()`: Determine pill state for each day
- `getWeekDates()`: Get array of dates for a week offset