import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

export async function DELETE() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getAdminSupabaseClient();

    // Get the user's Supabase profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (profile) {
      // Delete all user data from Supabase
      // Due to CASCADE constraints, deleting the profile will delete:
      // - attempts
      // - practice_sessions
      // - user_skill_levels
      // - subscriptions
      // - free_tier_usage
      // - weekly_xp
      // - user_xp
      // - word_of_the_day
      // etc.

      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', profile.user_id);

      if (deleteError) {
        console.error('Error deleting user data from Supabase:', deleteError);
        // Continue with Clerk deletion even if Supabase deletion fails
      }
    }

    // Delete the user from Clerk
    try {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(clerkUserId);
    } catch (clerkError) {
      console.error('Error deleting user from Clerk:', clerkError);
      return NextResponse.json(
        { error: 'Failed to delete account from authentication provider' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in account deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
