import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

type ProgressResponse = {
  days: Array<{ date: string; count: number }>;
  totalQuestions: number;
  currentStreakWeeks: number;
  bestStreakDays: number;
  currentStreakDays: number;
};

// Helper to get Monday of current week
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

// Helper to get Sunday of current week
function getSundayOfWeek(date: Date): Date {
  const monday = getMondayOfWeek(date);
  return new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Calculate daily streaks (current and best)
function calculateDailyStreaks(dayData: Array<{ date: string; count: number }>): { current: number; best: number } {
  // Sort days by date
  const sortedDays = [...dayData].sort((a, b) => a.date.localeCompare(b.date));

  // Get today's date in YYYY-MM-DD format
  const today = formatDate(new Date());

  // Calculate current streak (counting back from today)
  let currentStreak = 0;
  const todayIndex = sortedDays.findIndex(d => d.date === today);

  // Check if user practiced today
  if (todayIndex >= 0 && sortedDays[todayIndex].count > 0) {
    currentStreak = 1;

    // Count consecutive days before today
    for (let i = todayIndex - 1; i >= 0; i--) {
      const currentDate = new Date(sortedDays[i + 1].date);
      const prevDate = new Date(sortedDays[i].date);
      const dayDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (dayDiff === 1 && sortedDays[i].count > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else if (todayIndex > 0) {
    // Check if yesterday has practice (grace period for today)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);
    const yesterdayIndex = sortedDays.findIndex(d => d.date === yesterdayStr);

    if (yesterdayIndex >= 0 && sortedDays[yesterdayIndex].count > 0) {
      currentStreak = 1;

      // Count consecutive days before yesterday
      for (let i = yesterdayIndex - 1; i >= 0; i--) {
        const currentDate = new Date(sortedDays[i + 1].date);
        const prevDate = new Date(sortedDays[i].date);
        const dayDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (dayDiff === 1 && sortedDays[i].count > 0) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  // Calculate best streak across all days
  let bestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < sortedDays.length; i++) {
    if (sortedDays[i].count > 0) {
      if (i === 0 || tempStreak === 0) {
        tempStreak = 1;
      } else {
        const currentDate = new Date(sortedDays[i].date);
        const prevDate = new Date(sortedDays[i - 1].date);
        const dayDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Make sure best streak is at least as good as current streak
  bestStreak = Math.max(bestStreak, currentStreak);

  return { current: currentStreak, best: bestStreak };
}

// Calculate consecutive week streak and best streak
function calculateWeekStreaks(dayData: Array<{ date: string; count: number }>): { current: number; best: number } {
  // Group by week (Monday to Sunday)
  const weeks = new Map<string, number>();

  dayData.forEach(({ date, count }) => {
    const d = new Date(date);
    const monday = getMondayOfWeek(d);
    const weekKey = formatDate(monday);
    weeks.set(weekKey, (weeks.get(weekKey) || 0) + count);
  });

  // Get all Mondays for the last 12 weeks
  const now = new Date();
  const currentMonday = getMondayOfWeek(now);
  const allWeeks: string[] = [];

  for (let i = 0; i < 12; i++) {
    const monday = new Date(currentMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    allWeeks.push(formatDate(monday));
  }

  // Count consecutive weeks with activity, starting from current week
  let currentStreak = 0;
  for (const weekKey of allWeeks) {
    if ((weeks.get(weekKey) || 0) > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate best streak across all weeks
  let bestStreak = 0;
  let tempStreak = 0;

  // Check all weeks in reverse chronological order
  for (let i = allWeeks.length - 1; i >= 0; i--) {
    if ((weeks.get(allWeeks[i]) || 0) > 0) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Make sure best streak is at least as good as current streak
  bestStreak = Math.max(bestStreak, currentStreak);

  return { current: currentStreak, best: bestStreak };
}

export async function GET() {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Supabase admin client
    const supabase = getAdminSupabaseClient();

    // Get or create Supabase user using Clerk ID
    const { data: mappedUserId, error: mappingError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: user.id,
        p_email: user.emailAddresses[0]?.emailAddress || null,
        p_display_name: user.firstName || user.username || 'User'
      }
    );

    if (mappingError) {
      console.error('Error mapping user:', mappingError);
      return NextResponse.json({ error: 'Failed to map user' }, { status: 500 });
    }

    const supabaseUserId = mappedUserId;

    // Calculate date range for last 12 weeks
    const now = new Date();
    const currentSunday = getSundayOfWeek(now);
    currentSunday.setHours(23, 59, 59, 999);

    const startMonday = getMondayOfWeek(now);
    startMonday.setDate(startMonday.getDate() - 11 * 7); // Go back 11 weeks
    startMonday.setHours(0, 0, 0, 0);

    // Get total questions count
    const { count: totalQuestions, error: countError } = await supabase
      .from('practice_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', supabaseUserId);

    if (countError) {
      console.error('Error fetching total questions:', countError);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    // Get daily counts for the date range
    const { data: sessions, error: sessionsError } = await supabase
      .from('practice_sessions')
      .select('started_at')
      .eq('user_id', supabaseUserId)
      .gte('started_at', startMonday.toISOString())
      .lte('started_at', currentSunday.toISOString());

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Count completions per day
    const dailyCounts = new Map<string, number>();
    sessions?.forEach((session) => {
      const date = new Date(session.started_at);
      const dateKey = formatDate(date);
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
    });

    // Generate dense array of days for the last 12 weeks
    const days: Array<{ date: string; count: number }> = [];
    const currentDate = new Date(startMonday);

    while (currentDate <= currentSunday) {
      const dateKey = formatDate(currentDate);
      days.push({
        date: dateKey,
        count: dailyCounts.get(dateKey) || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate consecutive week streak
    const weekStreaks = calculateWeekStreaks(days);

    // Calculate daily streaks
    const dailyStreaks = calculateDailyStreaks(days);

    const response: ProgressResponse = {
      days,
      totalQuestions: totalQuestions || 0,
      currentStreakWeeks: weekStreaks.current,
      bestStreakDays: dailyStreaks.best,
      currentStreakDays: dailyStreaks.current
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in progress API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}