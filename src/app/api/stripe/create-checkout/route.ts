/**
 * Create Stripe Checkout Session
 * Creates a new checkout session for subscription purchase
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { SERVER_ENV, PUBLIC_ENV } from '@/lib/env.server';
import type { GetOrCreateUserParams } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user with Clerk
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate Stripe configuration
    if (!SERVER_ENV.STRIPE_SECRET_KEY || !SERVER_ENV.STRIPE_PRICE_ID) {
      console.error('Stripe not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const stripe = getStripeClient();
    const supabase = getAdminSupabaseClient();

    // Get or create Supabase user
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: userId,
        p_email: user?.emailAddresses[0]?.emailAddress,
        p_display_name: user?.firstName || user?.username || 'User',
      } satisfies GetOrCreateUserParams
    );

    if (userError || !supabaseUserId) {
      console.error('Failed to get/create user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check for existing subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, status')
      .eq('user_id', supabaseUserId)
      .single();

    // If already has active subscription, return error
    if (existingSub?.status === 'active') {
      return NextResponse.json(
        { error: 'Already subscribed' },
        { status: 400 }
      );
    }

    let customerId = existingSub?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.emailAddresses[0]?.emailAddress,
        name: user?.firstName
          ? `${user.firstName} ${user.lastName || ''}`.trim()
          : undefined,
        metadata: {
          clerk_user_id: userId,
          supabase_user_id: supabaseUserId,
        },
      });
      customerId = customer.id;

      // Store customer ID in subscriptions table
      await supabase.from('subscriptions').upsert(
        {
          user_id: supabaseUserId,
          stripe_customer_id: customerId,
          status: 'incomplete',
        },
        { onConflict: 'user_id' }
      );
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: SERVER_ENV.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${PUBLIC_ENV.SITE_URL}/app?subscription=success`,
      cancel_url: `${PUBLIC_ENV.SITE_URL}/app?subscription=canceled`,
      metadata: {
        clerk_user_id: userId,
        supabase_user_id: supabaseUserId,
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address for tax purposes
      billing_address_collection: 'auto',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: message },
      { status: 500 }
    );
  }
}
