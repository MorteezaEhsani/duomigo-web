-- Add timezone column to profiles table
ALTER TABLE profiles 
ADD COLUMN timezone TEXT DEFAULT 'America/Los_Angeles';

-- Add index for timezone lookups
CREATE INDEX idx_profiles_timezone ON profiles(timezone);

-- Create secure RPC function for timezone-aware daily activity upsert
CREATE OR REPLACE FUNCTION upsert_daily_activity_tz(
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
  -- Verify the user exists and matches the authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: User ID does not match authenticated user';
  END IF;

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
  -- This ensures we're counting activity for the correct day in their timezone
  v_local_date := (p_now_ts AT TIME ZONE v_user_tz)::DATE;

  -- Upsert the daily activity record
  INSERT INTO daily_activity (user_id, activity_date, minutes_practiced, last_active_at)
  VALUES (p_user_id, v_local_date, p_minutes, p_now_ts)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    minutes_practiced = daily_activity.minutes_practiced + EXCLUDED.minutes_practiced,
    last_active_at = GREATEST(daily_activity.last_active_at, EXCLUDED.last_active_at);

  -- Update user's streak information
  -- Check if this activity extends or breaks the streak
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
      -- If last activity was yesterday or today, increment streak
      WHEN streaks.last_activity_date >= v_local_date - INTERVAL '1 day' 
        AND streaks.last_activity_date <= v_local_date
      THEN 
        CASE 
          WHEN streaks.last_activity_date = v_local_date 
          THEN streaks.current_streak  -- Already counted today
          ELSE streaks.current_streak + 1  -- New day, increment
        END
      -- Otherwise reset to 1
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_daily_activity_tz TO authenticated;

-- Add RLS policy for the function
-- The function already checks auth.uid() internally

-- Create a helper function to get user's timezone
CREATE OR REPLACE FUNCTION get_user_timezone(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_timezone TEXT;
BEGIN
  -- Only allow users to get their own timezone
  IF p_user_id != auth.uid() THEN
    RETURN 'America/Los_Angeles'; -- Return default for other users
  END IF;

  SELECT COALESCE(timezone, 'America/Los_Angeles')
  INTO v_timezone
  FROM profiles
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_timezone, 'America/Los_Angeles');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_timezone TO authenticated;

-- Update the profiles table to ensure timezone is valid
ALTER TABLE profiles
ADD CONSTRAINT check_timezone_valid 
CHECK (
  timezone IS NULL OR 
  timezone IN (
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
    'UTC'
    -- Add more as needed
  )
);

-- Comment on the new column
COMMENT ON COLUMN profiles.timezone IS 'User timezone for calculating daily streaks and activity dates';