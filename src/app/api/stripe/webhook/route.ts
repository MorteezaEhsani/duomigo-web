/**
 * Stripe Webhook Handler
 * Handles subscription lifecycle events from Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { SERVER_ENV } from '@/lib/env.server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  console.log('=== Stripe Webhook Received ===');

  const stripe = getStripeClient();
  const supabase = getAdminSupabaseClient();

  // Get raw body for signature verification
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  console.log('Webhook signature present:', !!signature);
  console.log('Webhook secret configured:', !!SERVER_ENV.STRIPE_WEBHOOK_SECRET);
  console.log('Webhook secret length:', SERVER_ENV.STRIPE_WEBHOOK_SECRET?.length || 0);

  if (!signature) {
    console.error('Webhook error: Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  if (!SERVER_ENV.STRIPE_WEBHOOK_SECRET) {
    console.error('Webhook error: Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      SERVER_ENV.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Idempotency check - prevent duplicate processing
  const { data: existingEvent } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existingEvent) {
    console.log(`Event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Store event for idempotency
  const { error: insertError } = await supabase.from('stripe_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: JSON.parse(JSON.stringify(event.data.object)),
  });

  if (insertError) {
    console.error('Failed to store event:', insertError);
    // Continue processing anyway - better to have duplicate handling than miss events
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(stripe, supabase, session);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSucceeded(stripe, supabase, invoice);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed
 * Called when a customer completes the Stripe Checkout flow
 */
async function handleCheckoutComplete(
  stripe: Stripe,
  supabase: ReturnType<typeof getAdminSupabaseClient>,
  session: Stripe.Checkout.Session
) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!subscriptionId) {
    console.log('Checkout completed without subscription (one-time payment?)');
    return;
  }

  // Get subscription details from Stripe
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subData = sub as any;

  console.log('Subscription data from Stripe:', {
    subscriptionId,
    customerId,
    status: sub.status,
    currentPeriodStart: subData.current_period_start,
    currentPeriodEnd: subData.current_period_end,
  });

  // Build update object with safe date handling
  const updateData: Record<string, unknown> = {
    stripe_subscription_id: subscriptionId,
    status: 'active',
    price_id: subData.items?.data?.[0]?.price?.id || null,
    updated_at: new Date().toISOString(),
  };

  // Only add date fields if they exist
  if (subData.current_period_start) {
    updateData.current_period_start = new Date(subData.current_period_start * 1000).toISOString();
  }
  if (subData.current_period_end) {
    updateData.current_period_end = new Date(subData.current_period_end * 1000).toISOString();
  }

  // Update subscription record
  const { error, count } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Failed to update subscription:', error);
    throw error;
  }

  console.log(`Subscription activated for customer ${customerId}, rows updated: ${count}`);
}

/**
 * Handle invoice.payment_succeeded
 * Called when a subscription payment succeeds (including renewals)
 */
async function handlePaymentSucceeded(
  stripe: Stripe,
  supabase: ReturnType<typeof getAdminSupabaseClient>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoice: any
) {
  // Get subscription ID from invoice
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) {
    console.log('Payment succeeded for non-subscription invoice');
    return;
  }

  // Get subscription details from Stripe
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subData = sub as any;

  // Update subscription record
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date(subData.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Failed to update subscription on payment success:', error);
    throw error;
  }

  console.log(`Subscription renewed for subscription ${subscriptionId}`);
}

/**
 * Handle customer.subscription.deleted
 * Called when a subscription is canceled
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getAdminSupabaseClient>,
  subscription: Stripe.Subscription
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Failed to update subscription on deletion:', error);
    throw error;
  }

  console.log(`Subscription canceled: ${subscription.id}`);
}

/**
 * Handle customer.subscription.updated
 * Called when subscription details change
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof getAdminSupabaseClient>,
  subscription: Stripe.Subscription
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subData = subscription as any;

  // Map Stripe status to our status type
  const statusMap: Record<string, string> = {
    active: 'active',
    canceled: 'canceled',
    past_due: 'past_due',
    unpaid: 'unpaid',
    trialing: 'trialing',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
  };

  const status = statusMap[subscription.status] || 'incomplete';

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: status as 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired',
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Failed to update subscription:', error);
    throw error;
  }

  console.log(`Subscription updated: ${subscription.id}, status: ${status}`);
}

/**
 * Handle invoice.payment_failed
 * Called when a subscription payment fails
 */
async function handlePaymentFailed(
  supabase: ReturnType<typeof getAdminSupabaseClient>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoice: any
) {
  // Get subscription ID from invoice
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) {
    return;
  }

  // Update subscription status to past_due
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Failed to update subscription on payment failure:', error);
    throw error;
  }

  console.log(`Payment failed for subscription ${subscriptionId}`);
}
