import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import LeaderboardClient from './LeaderboardClient';

// Force dynamic rendering - don't cache this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  xp_earned: number;
  rank: number;
}

interface UserRank {
  xp_earned: number;
  rank: number;
  total_participants: number;
}

async function getLeaderboardData(clerkUserId: string) {
  const supabase = getAdminSupabaseClient();

  // Get user's Supabase ID and profile info
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (!profile) {
    return { leaderboard: [], userRank: null, currentUserId: null, currentUserProfile: null };
  }

  // Get weekly leaderboard
  const { data: leaderboard, error: leaderboardError } = await supabase.rpc('get_weekly_leaderboard', {
    p_limit: 50
  });

  if (leaderboardError) {
    console.error('Error fetching leaderboard:', leaderboardError);
  }

  // Get user's rank
  const { data: userRankData, error: userRankError } = await supabase.rpc('get_user_weekly_rank', {
    p_user_id: profile.user_id
  });

  if (userRankError) {
    console.error('Error fetching user rank:', userRankError);
  }

  // userRankData is returned as Json, need to handle it properly
  const userRank = (Array.isArray(userRankData) ? userRankData[0] : userRankData) as UserRank | undefined;

  return {
    leaderboard: (leaderboard || []) as LeaderboardEntry[],
    userRank: userRank || null,
    currentUserId: profile.user_id,
    currentUserProfile: {
      display_name: profile.display_name,
      avatar_url: null
    }
  };
}

function getWeekDateRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday is start of week

  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return {
    start: formatDate(monday),
    end: formatDate(sunday)
  };
}

export default async function LeaderboardsPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) {
    redirect('/sign-in');
  }

  const { leaderboard, userRank, currentUserId, currentUserProfile } = await getLeaderboardData(userId);
  const weekRange = getWeekDateRange();

  // Use Clerk's user data for accurate display name
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || user?.username || currentUserProfile?.display_name || 'Anonymous';

  return (
    <LeaderboardClient
      leaderboard={leaderboard}
      userRank={userRank}
      currentUserId={currentUserId}
      currentUserProfile={{
        display_name: displayName,
        avatar_url: user?.imageUrl || null
      }}
      weekRange={weekRange}
    />
  );
}
