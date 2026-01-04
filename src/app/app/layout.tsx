import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

async function checkPremiumStatus(userId: string): Promise<boolean> {
  try {
    const supabase = getAdminSupabaseClient();

    // Get user's Supabase ID from Clerk ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('clerk_user_id', userId)
      .single();

    if (!profile) return false;

    // Check premium status
    const { data } = await supabase.rpc('has_premium_access', {
      p_user_id: profile.user_id
    });

    return data === true;
  } catch {
    return false;
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const isPremium = await checkPremiumStatus(userId);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isPremium={isPremium} />
      {children}
    </div>
  );
}
