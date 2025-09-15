-- Add Clerk user ID column to profiles table (if not exists)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- Create index for Clerk user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON profiles(clerk_user_id);

-- Make user_id have a default UUID
ALTER TABLE profiles ALTER COLUMN user_id SET DEFAULT gen_random_uuid();

-- Create a simplified function to get or create user by Clerk ID
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
    timezone,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_clerk_user_id,
    p_email,
    COALESCE(p_display_name, split_part(p_email, '@', 1), 'User'),
    'America/Los_Angeles',
    NOW(),
    NOW()
  )
  ON CONFLICT (clerk_user_id) DO UPDATE
    SET email = COALESCE(profiles.email, EXCLUDED.email),
        display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
        updated_at = NOW()
  RETURNING user_id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_or_create_user_by_clerk_id TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_user_by_clerk_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user_by_clerk_id TO service_role;

-- Create the Clerk-compatible activity function
CREATE OR REPLACE FUNCTION upsert_daily_activity_tz_clerk(
  p_user_id UUID,
  p_tz TEXT,
  p_now_ts TIMESTAMPTZ,
  p_minutes INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_local_date DATE;
  v_user_tz TEXT;
BEGIN
  -- Get user's timezone from profile
  SELECT COALESCE(timezone, p_tz, 'America/Los_Angeles')
  INTO v_user_tz
  FROM profiles
  WHERE user_id = p_user_id;

  IF v_user_tz IS NULL THEN
    v_user_tz := COALESCE(p_tz, 'America/Los_Angeles');
  END IF;

  -- Convert to user's local date
  v_local_date := (p_now_ts AT TIME ZONE v_user_tz)::DATE;

  -- Upsert daily activity
  INSERT INTO daily_activity (user_id, activity_date, minutes_practiced, last_active_at)
  VALUES (p_user_id, v_local_date, p_minutes, p_now_ts)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    minutes_practiced = daily_activity.minutes_practiced + EXCLUDED.minutes_practiced,
    last_active_at = GREATEST(daily_activity.last_active_at, EXCLUDED.last_active_at);

  -- Update streaks
  INSERT INTO streaks (user_id, current_streak, best_streak, last_activity_date)
  VALUES (p_user_id, 1, 1, v_local_date)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_daily_activity_tz_clerk TO anon;
GRANT EXECUTE ON FUNCTION upsert_daily_activity_tz_clerk TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_daily_activity_tz_clerk TO service_role;