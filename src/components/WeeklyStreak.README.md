# WeeklyStreak Component

A Duolingo-inspired weekly streak UI component that displays user progress with animated flame badges and progress bars.

## Features

- 🔥 Animated flame badge with streak count
- 📊 Smooth spring animations for progress changes (600ms)
- 🎨 Responsive design (320px to 1440px)
- ♿ Full accessibility with ARIA labels
- 🌗 Dark mode support
- 📱 Mobile-friendly

## Installation

```bash
# Install required dependency
pnpm add framer-motion
```

## Usage

### Basic Example

```tsx
import WeeklyStreak from '@/components/WeeklyStreak';

export default function Dashboard() {
  return (
    <WeeklyStreak
      currentDayIndex={3}        // Wednesday (0=Sun, 6=Sat)
      progress={0.8}              // 80% of weekly goal
      streakDays={5}              // 5-day streak
      goalLabel="Complete 2 practices daily"
    />
  );
}
```

### With Monday Start

```tsx
<WeeklyStreak
  weekStart="mon"              // Week starts on Monday
  currentDayIndex={0}          // Monday is now index 0
  progress={0.5}
  streakDays={3}
/>
```

### Full Integration Example (Next.js Page)

```tsx
// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import WeeklyStreak from '@/components/WeeklyStreak';

export default function DashboardPage() {
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    weeklyProgress: 0
  });

  useEffect(() => {
    // Fetch user streak data from your API
    fetchUserStreakData().then(data => {
      setStreakData(data);
    });
  }, []);

  const today = new Date();
  const currentDay = today.getDay(); // 0=Sunday, 6=Saturday
  
  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your Progress</h1>
        
        <WeeklyStreak
          weekStart="sun"
          currentDayIndex={currentDay}
          progress={streakData.weeklyProgress}
          streakDays={streakData.currentStreak}
          goalLabel="Complete 2 practices daily"
          className="mb-8"
        />
        
        {/* Other dashboard content */}
      </div>
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `weekStart` | `"sun" \| "mon"` | `"sun"` | First day of the week |
| `currentDayIndex` | `number` | Required | Current day (0-6 based on weekStart) |
| `progress` | `number` | Required | Weekly progress (0-1, clamped) |
| `streakDays` | `number` | Required | Current streak count |
| `goalLabel` | `string` | `"Complete 2 practices"` | Goal description text |
| `className` | `string` | `""` | Additional CSS classes |

## Customizing Colors

The component uses Tailwind CSS tokens. To customize colors, update your `tailwind.config.js`:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Customize yellow shades for the streak bar
        yellow: {
          100: '#FEF3C7',  // Rail background
          400: '#FCD34D',  // Progress bar start
          500: '#F59E0B',  // Progress bar end
          600: '#D97706',  // Text highlights
        },
        // For dark mode
        zinc: {
          400: '#A1A1AA',  // Muted text
          500: '#71717A',  // Weekday labels
          600: '#52525B',  // Secondary text
          800: '#27272A',  // Dark mode background
        }
      }
    }
  }
}
```

## Animation Tuning

The component uses Framer Motion for animations. To adjust animation behavior:

```tsx
// In WeeklyStreak.tsx, modify the transition object:
transition={{
  type: 'spring',
  stiffness: 100,    // Higher = snappier (50-200)
  damping: 15,       // Higher = less bounce (10-30)
  duration: 0.6,     // Fallback duration in seconds
}}
```

## Accessibility

The component includes:
- `role="progressbar"` with proper ARIA attributes
- `aria-label` describing the full streak status
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` for progress
- Keyboard focus ring (yellow-500)
- Semantic HTML structure

### Example ARIA Label Output
```
"Weekly streak progress: 3-day streak, 80% of weekly goal completed. Current day: W"
```

## Testing

Run the included tests:

```bash
npm run test WeeklyStreak.test.tsx
```

The test suite verifies:
- ARIA label generation
- Progress calculation and display
- Current day highlighting
- Week start options
- Progress clamping (0-100%)
- Custom props application

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Performance

- Uses CSS transforms for animations (GPU accelerated)
- Memoized calculations prevent unnecessary re-renders
- Smooth 60fps animations on most devices
- Lightweight: ~5KB gzipped (excluding Framer Motion)

## Responsive Behavior

- **Mobile (320-640px)**: Compact layout, smaller text
- **Tablet (641-1024px)**: Standard sizing
- **Desktop (1025px+)**: Full size with all details

## Known Issues

- Flame emoji may render differently across platforms
- Very long goal labels may overflow on mobile (use shorter labels)

## License

MIT