/**
 * Create Stripe Customer Portal Session
 * Allows users to manage their subscription
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { PUBLIC_ENV } from '@/lib/env.server';
import type { GetOrCreateUserParams } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user with Clerk
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripe = getStripeClient();
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

    // Get Stripe customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', supabaseUserId)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Create Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${PUBLIC_ENV.SITE_URL}/app/profile`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Portal error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create portal session', details: message },
      { status: 500 }
    );
  }
}
