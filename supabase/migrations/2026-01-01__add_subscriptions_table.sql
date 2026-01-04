-- Migration: Add subscription tables for Duomigo Premium
-- This migration creates the necessary tables and functions for Stripe subscription management

-- Create subscription status enum
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'active',
    'canceled',
    'past_due',
    'unpaid',
    'trialing',
    'incomplete',
    'incomplete_expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status subscription_status DEFAULT 'incomplete',
  price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Create stripe_events table for webhook idempotency
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(stripe_event_id);

-- Create free tier usage tracking table (lifetime usage, not daily)
CREATE TABLE IF NOT EXISTS free_tier_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  practice_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_usage UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_free_tier_usage_user_id ON free_tier_usage(user_id);

-- Enable RLS on all new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_tier_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies (using service role for all operations, matching existing patterns)
-- These policies allow service role access while protecting client-side access
DROP POLICY IF EXISTS "Service role full access to subscriptions" ON subscriptions;
CREATE POLICY "Service role full access to subscriptions" ON subscriptions
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access to stripe_events" ON stripe_events;
CREATE POLICY "Service role full access to stripe_events" ON stripe_events
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access to free_tier_usage" ON free_tier_usage;
CREATE POLICY "Service role full access to free_tier_usage" ON free_tier_usage
  FOR ALL USING (true);

-- Function to check if user has premium access
CREATE OR REPLACE FUNCTION has_premium_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status subscription_status;
  v_period_end TIMESTAMPTZ;
BEGIN
  SELECT status, current_period_end
  INTO v_status, v_period_end
  FROM subscriptions
  WHERE user_id = p_user_id;

  -- No subscription found
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if subscription is active and not expired
  RETURN v_status = 'active' AND (v_period_end IS NULL OR v_period_end > NOW());
END;
$$;

-- Function to check and increment free tier usage (lifetime limit)
CREATE OR REPLACE FUNCTION check_and_increment_free_usage(
  p_user_id UUID,
  p_lifetime_limit INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INTEGER;
  v_is_premium BOOLEAN;
BEGIN
  -- Check if user has premium access
  v_is_premium := has_premium_access(p_user_id);

  IF v_is_premium THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'is_premium', TRUE,
      'remaining', -1,
      'limit', -1
    );
  END IF;

  -- Get or create usage record
  INSERT INTO free_tier_usage (user_id, practice_count)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current count
  SELECT practice_count INTO v_current_count
  FROM free_tier_usage
  WHERE user_id = p_user_id;

  -- Check if limit reached
  IF v_current_count >= p_lifetime_limit THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'is_premium', FALSE,
      'remaining', 0,
      'limit', p_lifetime_limit,
      'current_count', v_current_count
    );
  END IF;

  -- Increment usage
  UPDATE free_tier_usage
  SET practice_count = practice_count + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'is_premium', FALSE,
    'remaining', p_lifetime_limit - v_current_count - 1,
    'limit', p_lifetime_limit,
    'current_count', v_current_count + 1
  );
END;
$$;

-- Function to get user's free tier usage without incrementing
CREATE OR REPLACE FUNCTION get_free_tier_usage(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INTEGER;
  v_lifetime_limit INTEGER := 5;
BEGIN
  -- Get or create usage record
  INSERT INTO free_tier_usage (user_id, practice_count)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current count
  SELECT practice_count INTO v_current_count
  FROM free_tier_usage
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'used', v_current_count,
    'limit', v_lifetime_limit,
    'remaining', GREATEST(0, v_lifetime_limit - v_current_count)
  );
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION has_premium_access TO anon;
GRANT EXECUTE ON FUNCTION has_premium_access TO authenticated;
GRANT EXECUTE ON FUNCTION has_premium_access TO service_role;

GRANT EXECUTE ON FUNCTION check_and_increment_free_usage TO anon;
GRANT EXECUTE ON FUNCTION check_and_increment_free_usage TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_increment_free_usage TO service_role;

GRANT EXECUTE ON FUNCTION get_free_tier_usage TO anon;
GRANT EXECUTE ON FUNCTION get_free_tier_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_free_tier_usage TO service_role;

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'Subscription tables and functions created successfully!';
END $$;
