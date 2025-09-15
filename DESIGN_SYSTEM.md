# Design System Documentation

## Color Palette

### Base Neutrals
- **Background**: `#F9FAFB` (brand-background)
- **Surfaces**: `#FFFFFF` (brand-surface)

### Text Colors
- **Primary**: `#111827` (brand-text-primary)
- **Secondary**: `#6B7280` (brand-text-secondary)

### Accent Colors

#### Amber/Gold (Motivation & Progress)
- **Default**: `#F59E0B` (brand-amber)
- **Light**: `#FBBF24` (brand-amber-light)
- **Dark**: `#D97706` (brand-amber-dark)

#### Emerald (Success States)
- **Default**: `#10B981` (brand-emerald)
- **Light**: `#34D399` (brand-emerald-light)
- **Dark**: `#059669` (brand-emerald-dark)

#### Rose (Error States)
- **Default**: `#EF4444` (brand-rose)
- **Light**: `#F87171` (brand-rose-light)
- **Dark**: `#DC2626` (brand-rose-dark)

### Practice Mode Colors

| Mode | Background | Icon Color | Usage |
|------|------------|------------|-------|
| Listen & Speak | `#DBEAFE` | `#3B82F6` | Audio-based practices |
| Speak About Photo | `#EDE9FE` | `#8B5CF6` | Visual description tasks |
| Read & Speak | `#D1FAE5` | `#10B981` | Text-based practices |
| Custom Practice | `#FEF3C7` | `#F59E0B` | User-created prompts |

## Component Guidelines

### PracticeCard Component

```tsx
<PracticeCard
  title="Your Practice Mode"
  description="Brief description"
  bgColor="#HEX_COLOR"
  iconColor="#HEX_COLOR"
  icon={<YourSVGIcon />}
  iconPath="/path/to/icon.png"  // Optional PNG icon
  onClick={() => handleClick()}
/>
```

**Design Principles:**
- Rounded corners (rounded-xl)
- Subtle shadow that elevates on hover
- 200ms smooth transitions
- Slight scale and translate on hover/active

### WeeklyStreak Component

```tsx
<WeeklyStreak
  weekStart="sun"
  currentDayIndex={0}
  progress={0.7}
  streakDays={5}
  goalLabel="Complete 2 practices daily"
/>
```

**Color Usage:**
- Progress bar: Amber gradient (`brand-amber-light` to `brand-amber`)
- Current day highlight: `brand-amber`
- Inactive days: `brand-text-secondary`

## Adding New Practice Modes

To add a new practice mode, follow these steps:

### 1. Define Colors in Tailwind Config

```ts
// tailwind.config.ts
'practice-new': {
  bg: '#YOUR_BG_COLOR',    // Light, pastel shade
  icon: '#YOUR_ICON_COLOR', // Vibrant, contrasting color
}
```

### 2. Add to Dashboard Practice Types

```tsx
// DashboardClient.tsx
const practiceTypes = [
  // ... existing types
  {
    type: 'new_practice_type',
    title: 'New Practice',
    description: 'What this practice does',
    bgColor: '#YOUR_BG_COLOR',
    iconColor: '#YOUR_ICON_COLOR',
    iconPath: '/icons/new-practice.png', // Optional
    fallbackIcon: (
      <svg className="w-12 h-12">
        {/* Your SVG icon */}
      </svg>
    )
  }
];
```

### 3. Color Selection Guidelines

When choosing colors for new practice modes:

1. **Background**: Use light, pastel shades (10-20% saturation)
2. **Icon**: Use vibrant, mid-tone colors (60-80% saturation)
3. **Ensure contrast**: Minimum 4.5:1 ratio for accessibility
4. **Test combinations**: Verify readability with text overlays

### Recommended Color Combinations

For future practice modes, consider these palettes:

| Theme | Background | Icon |
|-------|------------|------|
| Vocabulary | `#FEF3E2` | `#EA580C` |
| Grammar | `#F3E8FF` | `#9333EA` |
| Pronunciation | `#FECACA` | `#DC2626` |
| Conversation | `#CFFAFE` | `#0891B2` |
| Writing | `#E9D5FF` | `#7C3AED` |

## CSS Variables Fallback

The design system uses Tailwind classes, but you can also use CSS variables:

```css
:root {
  --brand-background: #F9FAFB;
  --brand-surface: #FFFFFF;
  --brand-text-primary: #111827;
  --brand-text-secondary: #6B7280;
  --brand-amber: #F59E0B;
  --brand-amber-light: #FBBF24;
  --brand-emerald: #10B981;
  --brand-rose: #EF4444;
}
```

## Accessibility Checklist

✅ All interactive elements have focus states  
✅ Color contrast meets WCAG AA standards  
✅ ARIA labels on all practice cards  
✅ Keyboard navigation fully supported  
✅ Progress indicators have proper ARIA attributes  

## Animation Standards

- **Duration**: 200ms for hover states
- **Easing**: ease-in-out for smooth transitions
- **Scale**: max 1.02 on hover, 0.98 on active
- **Translate**: -1px on Y-axis for lift effect

## Typography

- **Headings**: font-bold, text-brand-text-primary
- **Body**: font-normal, text-brand-text-secondary
- **Small/Labels**: text-sm or text-xs
- **Interactive**: Add hover color transitions

## Shadows

- **Default Card**: `shadow-card` (subtle)
- **Hover Card**: `shadow-card-hover` (elevated)
- **Focus Ring**: 2px amber ring with offset

## Maintaining Consistency

1. Always use semantic color names (brand-*, practice-*)
2. Keep hover animations at 200ms
3. Use consistent border radius (rounded-xl for cards)
4. Maintain the same shadow progression
5. Test new colors in both light backgrounds
6. Verify accessibility with contrast checkers