/**
 * Get Subscription Status
 * Returns user's subscription status and free tier usage
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import type { GetOrCreateUserParams } from '@/types/api';
import type { PremiumStatus, FreeUsage } from '@/types/subscription.types';

export async function GET() {
  try {
    // Authenticate user with Clerk
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    // Get Supabase user ID
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: userId,
        p_email: user?.emailAddresses[0]?.emailAddress,
        p_display_name: user?.firstName || user?.username || 'User',
      } satisfies GetOrCreateUserParams
    );

    if (userError || !supabaseUserId) {
      console.error('Failed to get user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription details first for debugging
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', supabaseUserId)
      .single();

    console.log('=== Subscription Status Debug ===');
    console.log('User ID:', supabaseUserId);
    console.log('Subscription from DB:', JSON.stringify(subscription, null, 2));

    // Check premium access via database function
    const { data: hasPremium, error: premiumError } = await supabase.rpc(
      'has_premium_access',
      { p_user_id: supabaseUserId }
    );

    console.log('has_premium_access result:', hasPremium);

    if (premiumError) {
      console.error('Failed to check premium access:', premiumError);
    }

    // Get free tier usage if not premium
    let freeUsage: FreeUsage | null = null;
    if (!hasPremium) {
      const { data: usageData, error: usageError } = await supabase.rpc(
        'get_free_tier_usage',
        { p_user_id: supabaseUserId }
      );

      if (!usageError && usageData) {
        freeUsage = usageData as unknown as FreeUsage;
      }
    }

    const response: PremiumStatus = {
      isPremium: hasPremium || false,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          }
        : null,
      freeUsage,
    };

    console.log('Response isPremium:', response.isPremium);
    console.log('Response subscription status:', response.subscription?.status);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Status error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get subscription status', details: message },
      { status: 500 }
    );
  }
}
