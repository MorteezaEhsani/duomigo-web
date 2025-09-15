-- Add Clerk user ID column to profiles table
ALTER TABLE profiles 
ADD COLUMN clerk_user_id TEXT UNIQUE;

-- Create index for Clerk user lookups
CREATE INDEX idx_profiles_clerk_user_id ON profiles(clerk_user_id);

-- Update the profiles table to allow null auth.uid() since we're using Clerk
-- This allows us to insert records without Supabase auth
ALTER TABLE profiles ALTER COLUMN user_id SET DEFAULT gen_random_uuid();

-- Create a function to get or create user by Clerk ID
CREATE OR REPLACE FUNCTION get_or_create_user_by_clerk_id(
  p_clerk_user_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to find existing user
  SELECT user_id INTO v_user_id
  FROM profiles
  WHERE clerk_user_id = p_clerk_user_id;

  -- If found, return the user_id
  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  -- Create new user
  v_user_id := gen_random_uuid();
  
  INSERT INTO profiles (
    user_id,
    clerk_user_id,
    email,
    display_name,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_clerk_user_id,
    p_email,
    COALESCE(p_display_name, split_part(p_email, '@', 1), 'User'),
    NOW(),
    NOW()
  );

  RETURN v_user_id;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition where user was created between SELECT and INSERT
    SELECT user_id INTO v_user_id
    FROM profiles
    WHERE clerk_user_id = p_clerk_user_id;
    RETURN v_user_id;
END;
$$;

-- Update RLS policies to work with service role
-- Since we're using Clerk for auth, we'll rely on service role + application-level security

-- Drop existing RLS policies that depend on auth.uid()
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own daily activity" ON daily_activity;
DROP POLICY IF EXISTS "Users can insert own daily activity" ON daily_activity;
DROP POLICY IF EXISTS "Users can view own streaks" ON streaks;
DROP POLICY IF EXISTS "Users can update own streaks" ON streaks;
DROP POLICY IF EXISTS "Users can view own practice sessions" ON practice_sessions;
DROP POLICY IF EXISTS "Users can create own practice sessions" ON practice_sessions;
DROP POLICY IF EXISTS "Users can view own attempts" ON attempts;
DROP POLICY IF EXISTS "Users can create own attempts" ON attempts;

-- Create new policies that allow service role full access
-- We'll handle authorization in the application layer with Clerk

-- For profiles table
CREATE POLICY "Service role has full access to profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For daily_activity table
CREATE POLICY "Service role has full access to daily_activity"
  ON daily_activity
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For streaks table
CREATE POLICY "Service role has full access to streaks"
  ON streaks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For practice_sessions table
CREATE POLICY "Service role has full access to practice_sessions"
  ON practice_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For attempts table
CREATE POLICY "Service role has full access to attempts"
  ON attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For questions table (read-only for all)
CREATE POLICY "Service role can read questions"
  ON questions
  FOR SELECT
  TO service_role
  USING (true);

-- Update the upsert_daily_activity_tz function to not check auth.uid()
CREATE OR REPLACE FUNCTION upsert_daily_activity_tz_clerk(
  p_user_id UUID,
  p_tz TEXT,
  p_now_ts TIMESTAMPTZ,
  p_minutes INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_local_date DATE;
  v_user_tz TEXT;
BEGIN
  -- Get user's timezone from profile, fallback to provided timezone or default
  SELECT COALESCE(timezone, p_tz, 'America/Los_Angeles')
  INTO v_user_tz
  FROM profiles
  WHERE user_id = p_user_id;

  -- If no profile exists, use the provided timezone or default
  IF v_user_tz IS NULL THEN
    v_user_tz := COALESCE(p_tz, 'America/Los_Angeles');
  END IF;

  -- Convert the timestamp to the user's local date
  v_local_date := (p_now_ts AT TIME ZONE v_user_tz)::DATE;

  -- Upsert the daily activity record
  INSERT INTO daily_activity (user_id, activity_date, minutes_practiced, last_active_at)
  VALUES (p_user_id, v_local_date, p_minutes, p_now_ts)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    minutes_practiced = daily_activity.minutes_practiced + EXCLUDED.minutes_practiced,
    last_active_at = GREATEST(daily_activity.last_active_at, EXCLUDED.last_active_at);

  -- Update user's streak information
  WITH streak_calc AS (
    SELECT 
      user_id,
      MAX(CASE 
        WHEN activity_date = v_local_date - INTERVAL '1 day' 
          OR activity_date = v_local_date 
        THEN current_streak + 1 
        ELSE 1 
      END) as new_current_streak
    FROM streaks
    WHERE user_id = p_user_id
    GROUP BY user_id
  )
  INSERT INTO streaks (user_id, current_streak, best_streak, last_activity_date)
  VALUES (
    p_user_id, 
    1, 
    1, 
    v_local_date
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_streak = CASE
      WHEN streaks.last_activity_date >= v_local_date - INTERVAL '1 day' 
        AND streaks.last_activity_date <= v_local_date
      THEN 
        CASE 
          WHEN streaks.last_activity_date = v_local_date 
          THEN streaks.current_streak
          ELSE streaks.current_streak + 1
        END
      ELSE 1
    END,
    best_streak = GREATEST(
      streaks.best_streak,
      CASE
        WHEN streaks.last_activity_date >= v_local_date - INTERVAL '1 day' 
          AND streaks.last_activity_date < v_local_date
        THEN streaks.current_streak + 1
        WHEN streaks.last_activity_date = v_local_date
        THEN streaks.current_streak
        ELSE 1
      END
    ),
    last_activity_date = v_local_date;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION upsert_daily_activity_tz_clerk TO service_role;
GRANT EXECUTE ON FUNCTION get_or_create_user_by_clerk_id TO service_role;