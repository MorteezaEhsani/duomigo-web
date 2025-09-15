import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WeeklyStreak from '../WeeklyStreak';

describe('WeeklyStreak Component', () => {
  it('renders with correct ARIA label including streak days and progress percentage', () => {
    render(
      <WeeklyStreak
        currentDayIndex={6}
        progress={0.8}
        streakDays={3}
        weekStart="sun"
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute(
      'aria-label',
      'Weekly streak progress: 3-day streak, 80% of weekly goal completed. Current day: S'
    );
  });

  it('calculates and displays correct fill width based on progress', () => {
    const { container } = render(
      <WeeklyStreak
        currentDayIndex={6}
        progress={0.8}
        streakDays={3}
      />
    );

    // Check if the progress text shows 80%
    expect(screen.getByText('80% complete')).toBeInTheDocument();
    
    // Check ARIA value attributes
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '80');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('highlights the current day correctly', () => {
    render(
      <WeeklyStreak
        currentDayIndex={3} // Wednesday
        progress={0.5}
        streakDays={2}
        weekStart="sun"
      />
    );

    // The component should highlight Wednesday (index 3)
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Current day: W')
    );
  });

  it('displays correct streak days text', () => {
    render(
      <WeeklyStreak
        currentDayIndex={0}
        progress={0.3}
        streakDays={5}
      />
    );

    expect(screen.getByText('5 days 🔥')).toBeInTheDocument();
  });

  it('handles Monday start week correctly', () => {
    render(
      <WeeklyStreak
        currentDayIndex={0}
        progress={0.5}
        streakDays={1}
        weekStart="mon"
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Current day: M')
    );
  });

  it('clamps progress values to 0-1 range', () => {
    const { rerender } = render(
      <WeeklyStreak
        currentDayIndex={0}
        progress={1.5} // Over 100%
        streakDays={10}
      />
    );

    expect(screen.getByText('100% complete')).toBeInTheDocument();

    rerender(
      <WeeklyStreak
        currentDayIndex={0}
        progress={-0.5} // Negative
        streakDays={0}
      />
    );

    expect(screen.getByText('0% complete')).toBeInTheDocument();
  });

  it('displays custom goal label', () => {
    render(
      <WeeklyStreak
        currentDayIndex={2}
        progress={0.6}
        streakDays={4}
        goalLabel="Practice 3 times this week"
      />
    );

    expect(screen.getByText('Practice 3 times this week')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <WeeklyStreak
        currentDayIndex={0}
        progress={0.5}
        streakDays={1}
        className="custom-test-class"
      />
    );

    const component = container.querySelector('.custom-test-class');
    expect(component).toBeInTheDocument();
  });
});