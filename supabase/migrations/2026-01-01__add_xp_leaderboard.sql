-- Migration: Add XP system and Leaderboard tables
-- This migration creates the necessary tables and functions for XP tracking and weekly leaderboards

-- Weekly XP tracking (resets each week)
CREATE TABLE IF NOT EXISTS weekly_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  week_start DATE NOT NULL,  -- Monday of the week
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Lifetime XP tracking (for all-time stats)
CREATE TABLE IF NOT EXISTS user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_weekly_xp_user_week ON weekly_xp(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_xp_week_xp ON weekly_xp(week_start, xp_earned DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_user ON user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_total ON user_xp(total_xp DESC);

-- Enable RLS
ALTER TABLE weekly_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- RLS policies (using service role pattern)
DROP POLICY IF EXISTS "Service role full access to weekly_xp" ON weekly_xp;
CREATE POLICY "Service role full access to weekly_xp" ON weekly_xp
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access to user_xp" ON user_xp;
CREATE POLICY "Service role full access to user_xp" ON user_xp
  FOR ALL USING (true);

-- Function to get Monday of current week (UTC)
CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
  SELECT date_trunc('week', NOW() AT TIME ZONE 'UTC')::date;
$$;

-- Function to award XP for an attempt
-- Calculates XP from attempt scores and updates both weekly and lifetime XP
-- Note: Scores are stored on 0-5 scale in the database, so we multiply by 20 to get 0-100
CREATE OR REPLACE FUNCTION award_xp_for_attempt(p_attempt_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_xp_earned INTEGER;
  v_avg_score NUMERIC;
  v_overall_score INTEGER;
  v_week_start DATE;
BEGIN
  -- Get the attempt details
  -- Use overall_score if available (already 0-100), otherwise calculate from individual scores
  SELECT
    a.user_id,
    COALESCE(a.overall_score, a.score, 0)
  INTO v_user_id, v_overall_score
  FROM attempts a
  WHERE a.id = p_attempt_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
  END IF;

  -- Calculate XP (overall score / 10, rounded down)
  -- This gives 0-10 XP per attempt based on performance
  v_xp_earned := FLOOR(v_overall_score / 10.0);

  -- Get current week start
  v_week_start := get_current_week_start();

  -- Update weekly XP
  INSERT INTO weekly_xp (user_id, week_start, xp_earned)
  VALUES (v_user_id, v_week_start, v_xp_earned)
  ON CONFLICT (user_id, week_start)
  DO UPDATE SET
    xp_earned = weekly_xp.xp_earned + v_xp_earned,
    updated_at = NOW();

  -- Update lifetime XP
  INSERT INTO user_xp (user_id, total_xp)
  VALUES (v_user_id, v_xp_earned)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_xp = user_xp.total_xp + v_xp_earned,
    updated_at = NOW();

  RETURN v_xp_earned;
END;
$$;

-- Function to get weekly leaderboard
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

-- Function to get user's rank and XP for current week
CREATE OR REPLACE FUNCTION get_user_weekly_rank(p_user_id UUID)
RETURNS TABLE (
  xp_earned INTEGER,
  rank BIGINT,
  total_participants BIGINT
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
  WITH ranked_users AS (
    SELECT
      wx.user_id,
      wx.xp_earned,
      RANK() OVER (ORDER BY wx.xp_earned DESC) as user_rank
    FROM weekly_xp wx
    WHERE wx.week_start = v_week_start
  )
  SELECT
    COALESCE(ru.xp_earned, 0)::INTEGER,
    COALESCE(ru.user_rank, 0)::BIGINT,
    (SELECT COUNT(*) FROM ranked_users)::BIGINT
  FROM (SELECT p_user_id as uid) t
  LEFT JOIN ranked_users ru ON ru.user_id = t.uid;
END;
$$;

-- Helper function to map question type to skill type
CREATE OR REPLACE FUNCTION get_skill_type_from_question_type(p_question_type TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_question_type IN ('listen_then_speak', 'speak_about_photo', 'read_then_speak', 'custom_prompt') THEN 'speaking'
    WHEN p_question_type IN ('writing_sample', 'interactive_writing', 'write_about_photo', 'custom_writing') THEN 'writing'
    WHEN p_question_type IN ('listen_and_type', 'listen_and_respond', 'listen_and_complete', 'listen_and_summarize') THEN 'listening'
    WHEN p_question_type IN ('read_and_select', 'fill_in_the_blanks', 'read_and_complete', 'interactive_reading') THEN 'reading'
    ELSE 'speaking'  -- Default fallback
  END;
$$;

-- Function to get user's weak skill types based on average scores
CREATE OR REPLACE FUNCTION get_weak_skill_types(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 4
)
RETURNS TABLE (
  skill_type TEXT,
  avg_score NUMERIC,
  attempt_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH recent_attempts AS (
    -- Get recent attempts per skill type (derived from question type)
    SELECT
      get_skill_type_from_question_type(q.type) as derived_skill_type,
      a.fluency_score,
      a.pronunciation_score,
      a.grammar_score,
      a.vocabulary_score,
      a.coherence_score,
      ROW_NUMBER() OVER (PARTITION BY get_skill_type_from_question_type(q.type) ORDER BY a.attempted_at DESC) as rn
    FROM attempts a
    JOIN questions q ON q.id = a.question_id
    WHERE a.user_id = p_user_id
      AND a.fluency_score IS NOT NULL
  ),
  skill_averages AS (
    -- Calculate average score per skill type (last 20 attempts)
    SELECT
      ra.derived_skill_type as skill_type,
      AVG(
        (COALESCE(ra.fluency_score, 0) +
         COALESCE(ra.pronunciation_score, 0) +
         COALESCE(ra.grammar_score, 0) +
         COALESCE(ra.vocabulary_score, 0) +
         COALESCE(ra.coherence_score, 0)) / 5.0
      ) as avg_score,
      COUNT(*) as attempt_count
    FROM recent_attempts ra
    WHERE ra.rn <= 20
    GROUP BY ra.derived_skill_type
  ),
  all_skill_types AS (
    SELECT unnest(ARRAY['speaking', 'writing', 'listening', 'reading']) as skill_type
  )
  -- Return skill types ordered by average score (lowest first)
  -- Include skill types with no attempts (they need practice too)
  SELECT
    ast.skill_type,
    COALESCE(sa.avg_score, 0) as avg_score,
    COALESCE(sa.attempt_count, 0) as attempt_count
  FROM all_skill_types ast
  LEFT JOIN skill_averages sa ON sa.skill_type = ast.skill_type
  ORDER BY COALESCE(sa.avg_score, 0) ASC, COALESCE(sa.attempt_count, 0) ASC
  LIMIT p_limit;
END;
$$;

-- Function to get user's lifetime XP
CREATE OR REPLACE FUNCTION get_user_total_xp(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT total_xp INTO v_total
  FROM user_xp
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_total, 0);
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_current_week_start TO anon;
GRANT EXECUTE ON FUNCTION get_current_week_start TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_week_start TO service_role;

GRANT EXECUTE ON FUNCTION get_skill_type_from_question_type TO anon;
GRANT EXECUTE ON FUNCTION get_skill_type_from_question_type TO authenticated;
GRANT EXECUTE ON FUNCTION get_skill_type_from_question_type TO service_role;

GRANT EXECUTE ON FUNCTION award_xp_for_attempt TO anon;
GRANT EXECUTE ON FUNCTION award_xp_for_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION award_xp_for_attempt TO service_role;

GRANT EXECUTE ON FUNCTION get_weekly_leaderboard TO anon;
GRANT EXECUTE ON FUNCTION get_weekly_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_leaderboard TO service_role;

GRANT EXECUTE ON FUNCTION get_user_weekly_rank TO anon;
GRANT EXECUTE ON FUNCTION get_user_weekly_rank TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_weekly_rank TO service_role;

GRANT EXECUTE ON FUNCTION get_weak_skill_types TO anon;
GRANT EXECUTE ON FUNCTION get_weak_skill_types TO authenticated;
GRANT EXECUTE ON FUNCTION get_weak_skill_types TO service_role;

GRANT EXECUTE ON FUNCTION get_user_total_xp TO anon;
GRANT EXECUTE ON FUNCTION get_user_total_xp TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_total_xp TO service_role;

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'XP system and Leaderboard tables created successfully!';
END $$;
