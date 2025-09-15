-- Create a function to get current streak with automatic reset if user missed a day
CREATE OR REPLACE FUNCTION get_current_streak(p_user_id UUID)
RETURNS TABLE(
  current_streak INTEGER,
  best_streak INTEGER,
  last_activity_date DATE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_best_streak INTEGER;
  v_today DATE;
  v_timezone TEXT;
BEGIN
  -- Get user's timezone (default to UTC if not set)
  SELECT COALESCE(timezone, 'UTC') INTO v_timezone
  FROM profiles
  WHERE user_id = p_user_id;
  
  -- Get today's date in user's timezone
  v_today := (NOW() AT TIME ZONE v_timezone)::DATE;
  
  -- Get existing streak data
  SELECT 
    s.current_streak,
    s.best_streak,
    s.last_activity_date
  INTO 
    v_current_streak,
    v_best_streak,
    v_last_activity
  FROM streaks s
  WHERE s.user_id = p_user_id;
  
  -- If no streak record exists, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, NULL::DATE;
    RETURN;
  END IF;
  
  -- Check if streak should be reset
  -- If last activity was more than 1 day ago, reset current streak
  IF v_last_activity IS NOT NULL AND v_last_activity < (v_today - INTERVAL '1 day')::DATE THEN
    -- Streak is broken, reset to 0
    v_current_streak := 0;
    
    -- Update the streak record
    UPDATE streaks 
    SET current_streak = 0
    WHERE user_id = p_user_id;
  END IF;
  
  -- Return the (potentially updated) streak data
  RETURN QUERY SELECT v_current_streak, v_best_streak, v_last_activity;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_streak(UUID) TO authenticated;

-- Create an RPC function that can be called from the client
CREATE OR REPLACE FUNCTION get_user_streak_with_reset(p_clerk_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_streak_data RECORD;
BEGIN
  -- Get the Supabase user ID from Clerk ID
  SELECT user_id INTO v_user_id
  FROM profiles
  WHERE clerk_user_id = p_clerk_user_id;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'current_streak', 0,
      'best_streak', 0,
      'last_activity_date', NULL
    );
  END IF;
  
  -- Get the streak data with automatic reset if needed
  SELECT * INTO v_streak_data
  FROM get_current_streak(v_user_id);
  
  RETURN json_build_object(
    'current_streak', COALESCE(v_streak_data.current_streak, 0),
    'best_streak', COALESCE(v_streak_data.best_streak, 0),
    'last_activity_date', v_streak_data.last_activity_date
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_streak_with_reset(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_streak_with_reset(TEXT) TO anon;