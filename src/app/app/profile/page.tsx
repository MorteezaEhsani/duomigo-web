import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import ProfileClient from './ProfileClient';

interface UserStats {
  totalXp: number;
  weeklyXp: number;
  practicesCompleted: number;
}

async function getProfileData(clerkUserId: string) {
  const supabase = getAdminSupabaseClient();

  // Get user's Supabase profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (!profile) {
    return { profile: null, stats: null, isPremium: false };
  }

  // Get total XP
  const { data: totalXpData } = await supabase.rpc('get_user_total_xp', {
    p_user_id: profile.user_id
  });

  // Get weekly rank data
  const { data: weeklyRankData } = await supabase.rpc('get_user_weekly_rank', {
    p_user_id: profile.user_id
  });

  // Get total practices completed
  const { count: practicesCount } = await supabase
    .from('attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.user_id);

  // Check premium status
  const { data: isPremiumData } = await supabase.rpc('has_premium_access', {
    p_user_id: profile.user_id
  });

  const stats: UserStats = {
    totalXp: totalXpData || 0,
    weeklyXp: (Array.isArray(weeklyRankData) ? (weeklyRankData[0] as { xp_earned?: number })?.xp_earned : 0) || 0,
    practicesCompleted: practicesCount || 0
  };

  return {
    profile,
    stats,
    isPremium: isPremiumData === true
  };
}

export default async function ProfilePage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect('/sign-in');
  }

  const { profile, stats, isPremium } = await getProfileData(userId);

  return (
    <ProfileClient
      clerkUser={{
        id: userId,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        imageUrl: user.imageUrl
      }}
      profile={profile}
      stats={stats}
      isPremium={isPremium}
    />
  );
}
