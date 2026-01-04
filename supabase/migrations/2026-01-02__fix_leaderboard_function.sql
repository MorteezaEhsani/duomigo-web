-- Fix: Update get_weekly_leaderboard function to not reference avatar_url column
-- The profiles table doesn't have an avatar_url column

CREATE OR REPLACE FUNCTION get_weekly_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  xp_earned INTEGER,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
BEGIN
  v_week_start := get_current_week_start();

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    NULL::TEXT as avatar_url,
    COALESCE(wx.xp_earned, 0)::INTEGER as xp_earned,
    RANK() OVER (ORDER BY COALESCE(wx.xp_earned, 0) DESC) as rank
  FROM profiles p
  LEFT JOIN weekly_xp wx ON wx.user_id = p.user_id AND wx.week_start = v_week_start
  WHERE COALESCE(wx.xp_earned, 0) > 0
  ORDER BY COALESCE(wx.xp_earned, 0) DESC
  LIMIT p_limit;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_weekly_leaderboard TO anon;
GRANT EXECUTE ON FUNCTION get_weekly_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_leaderboard TO service_role;
