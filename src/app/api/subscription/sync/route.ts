/**
 * Sync Subscription Status from Stripe
 * This endpoint manually syncs a user's subscription status from Stripe
 * Use this when webhooks fail or to debug subscription issues
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/lib/stripe/client';

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();
    const stripe = getStripeClient();

    console.log('=== Manual Subscription Sync ===');
    console.log('Clerk User ID:', userId);

    // Get the user's Supabase ID first
    const { data: supabaseUserId } = await supabase.rpc('get_or_create_user_by_clerk_id', {
      p_clerk_user_id: userId,
      p_email: undefined,
      p_display_name: undefined,
    });

    if (!supabaseUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the user's subscription record from our database
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', supabaseUserId)
      .single();

    if (subError || !subscription) {
      console.log('No subscription found in database');
      return NextResponse.json({
        message: 'No subscription found',
        subscription: null
      });
    }

    console.log('Current DB subscription:', JSON.stringify(subscription, null, 2));

    // If we have a Stripe subscription ID, check its status in Stripe
    if (subscription.stripe_subscription_id) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id
        );

        console.log('Stripe subscription status:', stripeSub.status);

        // Map Stripe status to our status
        const statusMap: Record<string, string> = {
          active: 'active',
          canceled: 'canceled',
          past_due: 'past_due',
          unpaid: 'unpaid',
          trialing: 'trialing',
          incomplete: 'incomplete',
          incomplete_expired: 'incomplete_expired',
        };

        const newStatus = (statusMap[stripeSub.status] || 'incomplete') as 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired';

        // Update our database to match Stripe
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: newStatus,
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error('Failed to update subscription:', updateError);
          return NextResponse.json({
            error: 'Failed to update subscription',
            details: updateError
          }, { status: 500 });
        }

        console.log('Subscription synced successfully');
        console.log('Old status:', subscription.status);
        console.log('New status:', newStatus);

        return NextResponse.json({
          message: 'Subscription synced',
          oldStatus: subscription.status,
          newStatus: newStatus,
          stripeStatus: stripeSub.status,
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        });

      } catch (stripeError) {
        // Subscription might be deleted in Stripe
        console.error('Stripe error:', stripeError);

        // Mark as canceled if subscription doesn't exist in Stripe
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error('Failed to cancel subscription:', updateError);
        }

        return NextResponse.json({
          message: 'Subscription not found in Stripe - marked as canceled',
          oldStatus: subscription.status,
          newStatus: 'canceled',
        });
      }
    }

    // No Stripe subscription ID - check by customer ID
    if (subscription.stripe_customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: subscription.stripe_customer_id,
          limit: 1,
        });

        if (subscriptions.data.length === 0) {
          // No active subscription found - mark as canceled
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription.id);

          if (updateError) {
            console.error('Failed to cancel subscription:', updateError);
          }

          return NextResponse.json({
            message: 'No active Stripe subscription found - marked as canceled',
            oldStatus: subscription.status,
            newStatus: 'canceled',
          });
        }

        // Found a subscription - sync it
        const stripeSub = subscriptions.data[0];
        const statusMap: Record<string, string> = {
          active: 'active',
          canceled: 'canceled',
          past_due: 'past_due',
          unpaid: 'unpaid',
          trialing: 'trialing',
          incomplete: 'incomplete',
          incomplete_expired: 'incomplete_expired',
        };

        const newStatus = (statusMap[stripeSub.status] || 'incomplete') as 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired';

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: newStatus,
            stripe_subscription_id: stripeSub.id,
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error('Failed to update subscription:', updateError);
        }

        return NextResponse.json({
          message: 'Subscription synced from customer lookup',
          oldStatus: subscription.status,
          newStatus: newStatus,
          stripeStatus: stripeSub.status,
        });

      } catch (stripeError) {
        console.error('Stripe customer lookup error:', stripeError);
        return NextResponse.json({
          error: 'Failed to lookup customer in Stripe',
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: 'No Stripe IDs found to sync',
      subscription: subscription,
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
