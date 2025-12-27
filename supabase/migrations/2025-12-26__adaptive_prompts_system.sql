-- Migration: Adaptive AI-Powered Prompt Generation System
-- Creates tables for user skill levels, AI-generated prompts cache, and prompt usage tracking

-- =====================================================
-- 1. USER SKILL LEVELS TABLE
-- Tracks user proficiency per skill area and question type using CEFR levels
-- =====================================================

CREATE TABLE IF NOT EXISTS user_skill_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  skill_area TEXT NOT NULL CHECK (skill_area IN ('speaking', 'writing', 'listening', 'reading')),
  question_type TEXT NOT NULL,
  cefr_level TEXT NOT NULL DEFAULT 'A2' CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  numeric_level DECIMAL(3,2) NOT NULL DEFAULT 2.0 CHECK (numeric_level >= 1.0 AND numeric_level <= 6.0),
  attempts_at_level INTEGER NOT NULL DEFAULT 0,
  correct_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, skill_area, question_type)
);

-- Index for quick lookup by user
CREATE INDEX IF NOT EXISTS idx_user_skill_levels_user_id ON user_skill_levels(user_id);

-- Index for lookup by skill area and question type
CREATE INDEX IF NOT EXISTS idx_user_skill_levels_lookup ON user_skill_levels(user_id, skill_area, question_type);

-- =====================================================
-- 2. GENERATED PROMPTS TABLE
-- Cache for AI-generated prompts at different CEFR levels
-- =====================================================

CREATE TABLE IF NOT EXISTS generated_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_area TEXT NOT NULL CHECK (skill_area IN ('speaking', 'writing', 'listening', 'reading')),
  question_type TEXT NOT NULL,
  cefr_level TEXT NOT NULL CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  prompt_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  quality_score DECIMAL(3,2) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NULL
);

-- Primary lookup index for selecting prompts
CREATE INDEX IF NOT EXISTS idx_generated_prompts_lookup
  ON generated_prompts(skill_area, question_type, cefr_level, is_active);

-- Index for finding least-used prompts
CREATE INDEX IF NOT EXISTS idx_generated_prompts_usage
  ON generated_prompts(times_used ASC) WHERE is_active = true;

-- =====================================================
-- 3. PROMPT USAGE TABLE
-- Tracks which prompts each user has seen to avoid repetition
-- =====================================================

CREATE TABLE IF NOT EXISTS prompt_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES generated_prompts(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score INTEGER DEFAULT NULL,
  UNIQUE(user_id, prompt_id)
);

-- Index for finding unused prompts for a user
CREATE INDEX IF NOT EXISTS idx_prompt_usage_user_id ON prompt_usage(user_id);

-- Index for prompt popularity tracking
CREATE INDEX IF NOT EXISTS idx_prompt_usage_prompt_id ON prompt_usage(prompt_id);

-- =====================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE user_skill_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_usage ENABLE ROW LEVEL SECURITY;

-- User skill levels: Users can only see and modify their own levels
CREATE POLICY "Users can view own skill levels"
  ON user_skill_levels FOR SELECT
  USING (auth.uid()::text = (SELECT clerk_user_id FROM profiles WHERE user_id = user_skill_levels.user_id));

CREATE POLICY "Users can update own skill levels"
  ON user_skill_levels FOR UPDATE
  USING (auth.uid()::text = (SELECT clerk_user_id FROM profiles WHERE user_id = user_skill_levels.user_id));

CREATE POLICY "Users can insert own skill levels"
  ON user_skill_levels FOR INSERT
  WITH CHECK (auth.uid()::text = (SELECT clerk_user_id FROM profiles WHERE user_id = user_skill_levels.user_id));

-- Generated prompts: All authenticated users can read active prompts
CREATE POLICY "Authenticated users can read active prompts"
  ON generated_prompts FOR SELECT
  USING (is_active = true);

-- Prompt usage: Users can only see and modify their own usage
CREATE POLICY "Users can view own prompt usage"
  ON prompt_usage FOR SELECT
  USING (auth.uid()::text = (SELECT clerk_user_id FROM profiles WHERE user_id = prompt_usage.user_id));

CREATE POLICY "Users can insert own prompt usage"
  ON prompt_usage FOR INSERT
  WITH CHECK (auth.uid()::text = (SELECT clerk_user_id FROM profiles WHERE user_id = prompt_usage.user_id));

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to get or initialize user skill level
CREATE OR REPLACE FUNCTION get_or_create_user_skill_level(
  p_user_id UUID,
  p_skill_area TEXT,
  p_question_type TEXT
)
RETURNS user_skill_levels
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_skill_level user_skill_levels;
BEGIN
  -- Try to get existing record
  SELECT * INTO v_skill_level
  FROM user_skill_levels
  WHERE user_id = p_user_id
    AND skill_area = p_skill_area
    AND question_type = p_question_type;

  -- If not found, create with defaults (A2 level)
  IF NOT FOUND THEN
    INSERT INTO user_skill_levels (user_id, skill_area, question_type, cefr_level, numeric_level)
    VALUES (p_user_id, p_skill_area, p_question_type, 'A2', 2.0)
    RETURNING * INTO v_skill_level;
  END IF;

  RETURN v_skill_level;
END;
$$;

-- Function to update user skill level after an exercise
CREATE OR REPLACE FUNCTION update_user_skill_level(
  p_user_id UUID,
  p_skill_area TEXT,
  p_question_type TEXT,
  p_score INTEGER -- 0-100
)
RETURNS user_skill_levels
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current user_skill_levels;
  v_adjustment DECIMAL(3,2);
  v_new_numeric DECIMAL(3,2);
  v_new_cefr TEXT;
BEGIN
  -- Get current level (creates if not exists)
  SELECT * INTO v_current
  FROM get_or_create_user_skill_level(p_user_id, p_skill_area, p_question_type);

  -- Calculate adjustment based on score
  IF p_score >= 85 THEN
    v_adjustment := 0.15;
  ELSIF p_score >= 70 THEN
    v_adjustment := 0.05;
  ELSIF p_score >= 55 THEN
    v_adjustment := 0.0;
  ELSIF p_score >= 40 THEN
    v_adjustment := -0.05;
  ELSE
    v_adjustment := -0.15;
  END IF;

  -- Calculate new numeric level (clamped 1.0 to 6.0)
  v_new_numeric := GREATEST(1.0, LEAST(6.0, v_current.numeric_level + v_adjustment));

  -- Convert numeric to CEFR
  IF v_new_numeric < 1.5 THEN
    v_new_cefr := 'A1';
  ELSIF v_new_numeric < 2.5 THEN
    v_new_cefr := 'A2';
  ELSIF v_new_numeric < 3.5 THEN
    v_new_cefr := 'B1';
  ELSIF v_new_numeric < 4.5 THEN
    v_new_cefr := 'B2';
  ELSIF v_new_numeric < 5.5 THEN
    v_new_cefr := 'C1';
  ELSE
    v_new_cefr := 'C2';
  END IF;

  -- Update streak
  IF p_score >= 70 THEN
    v_current.correct_streak := v_current.correct_streak + 1;
  ELSE
    v_current.correct_streak := 0;
  END IF;

  -- Update the record
  UPDATE user_skill_levels
  SET
    numeric_level = v_new_numeric,
    cefr_level = v_new_cefr,
    attempts_at_level = CASE
      WHEN cefr_level = v_new_cefr THEN attempts_at_level + 1
      ELSE 1
    END,
    correct_streak = v_current.correct_streak,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND skill_area = p_skill_area
    AND question_type = p_question_type
  RETURNING * INTO v_current;

  RETURN v_current;
END;
$$;

-- Function to find unused prompt for user
CREATE OR REPLACE FUNCTION find_unused_prompt(
  p_user_id UUID,
  p_skill_area TEXT,
  p_question_type TEXT,
  p_cefr_level TEXT
)
RETURNS generated_prompts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prompt generated_prompts;
BEGIN
  -- Find a prompt that the user hasn't seen yet, preferring least used
  SELECT gp.* INTO v_prompt
  FROM generated_prompts gp
  WHERE gp.skill_area = p_skill_area
    AND gp.question_type = p_question_type
    AND gp.cefr_level = p_cefr_level
    AND gp.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM prompt_usage pu
      WHERE pu.prompt_id = gp.id AND pu.user_id = p_user_id
    )
  ORDER BY gp.times_used ASC, RANDOM()
  LIMIT 1;

  RETURN v_prompt;
END;
$$;

-- Function to record prompt usage
CREATE OR REPLACE FUNCTION record_prompt_usage(
  p_user_id UUID,
  p_prompt_id UUID,
  p_score INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert usage record
  INSERT INTO prompt_usage (user_id, prompt_id, score)
  VALUES (p_user_id, p_prompt_id, p_score)
  ON CONFLICT (user_id, prompt_id)
  DO UPDATE SET used_at = NOW(), score = COALESCE(p_score, prompt_usage.score);

  -- Increment times_used on the prompt
  UPDATE generated_prompts
  SET times_used = times_used + 1
  WHERE id = p_prompt_id;
END;
$$;

-- =====================================================
-- 6. SERVICE ROLE POLICIES (for API routes)
-- =====================================================

-- Allow service role full access for API operations
CREATE POLICY "Service role has full access to skill levels"
  ON user_skill_levels FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to generated prompts"
  ON generated_prompts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to prompt usage"
  ON prompt_usage FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
