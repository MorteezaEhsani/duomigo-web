/**
 * Sync Subscription from Stripe
 * Manually syncs subscription status from Stripe to database
 * Use this when webhooks fail or for debugging
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { SERVER_ENV } from '@/lib/env.server';
import type { GetOrCreateUserParams } from '@/types/api';

export async function POST() {
  try {
    // Authenticate user with Clerk
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate Stripe configuration
    if (!SERVER_ENV.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
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

    // Get existing subscription record from database
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', supabaseUserId)
      .single();

    if (!existingSub?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found', synced: false },
        { status: 404 }
      );
    }

    console.log('=== Sync Subscription ===');
    console.log('Customer ID:', existingSub.stripe_customer_id);

    // Get subscriptions from Stripe for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: existingSub.stripe_customer_id,
      status: 'all',
      limit: 1,
    });

    console.log('Stripe subscriptions found:', subscriptions.data.length);

    if (subscriptions.data.length === 0) {
      // Check for recent checkout sessions that might not have a subscription yet
      const sessions = await stripe.checkout.sessions.list({
        customer: existingSub.stripe_customer_id,
        limit: 5,
      });

      console.log('Checkout sessions found:', sessions.data.length);

      for (const session of sessions.data) {
        console.log('Session:', {
          id: session.id,
          status: session.status,
          payment_status: session.payment_status,
          subscription: session.subscription,
        });

        if (session.subscription && session.payment_status === 'paid') {
          // Found a paid session with subscription - retrieve it
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          subscriptions.data.push(sub);
          break;
        }
      }
    }

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'No subscriptions found in Stripe', synced: false },
        { status: 404 }
      );
    }

    // Get the most recent active subscription (or any subscription)
    const activeSubscription =
      subscriptions.data.find((s) => s.status === 'active') ||
      subscriptions.data[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subData = activeSubscription as any;

    console.log('Syncing subscription:', {
      id: activeSubscription.id,
      status: activeSubscription.status,
      current_period_start: subData.current_period_start,
      current_period_end: subData.current_period_end,
    });

    // Update subscription in database
    const updateData: Record<string, unknown> = {
      stripe_subscription_id: activeSubscription.id,
      status: activeSubscription.status,
      price_id: subData.items?.data?.[0]?.price?.id || null,
      updated_at: new Date().toISOString(),
    };

    if (subData.current_period_start) {
      updateData.current_period_start = new Date(
        subData.current_period_start * 1000
      ).toISOString();
    }
    if (subData.current_period_end) {
      updateData.current_period_end = new Date(
        subData.current_period_end * 1000
      ).toISOString();
    }
    if (activeSubscription.cancel_at_period_end !== undefined) {
      updateData.cancel_at_period_end = activeSubscription.cancel_at_period_end;
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', supabaseUserId);

    if (updateError) {
      console.error('Failed to update subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('Subscription synced successfully');

    return NextResponse.json({
      synced: true,
      status: activeSubscription.status,
      subscriptionId: activeSubscription.id,
    });
  } catch (error) {
    console.error('Sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to sync subscription', details: message },
      { status: 500 }
    );
  }
}
