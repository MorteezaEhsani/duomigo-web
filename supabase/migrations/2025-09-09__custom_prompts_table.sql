-- Migration: 2025-09-09__custom_prompts_table.sql
-- Purpose: Create custom_prompts table for user-saved prompts with RLS

BEGIN;

-- Create custom_prompts table
CREATE TABLE custom_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 90,
  times_practiced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_custom_prompts_user_id ON custom_prompts(user_id);
CREATE INDEX idx_custom_prompts_created_at ON custom_prompts(created_at DESC);

-- Enable RLS
ALTER TABLE custom_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and manage their own prompts
CREATE POLICY "Users can view own custom prompts" 
  ON custom_prompts FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own custom prompts" 
  ON custom_prompts FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own custom prompts" 
  ON custom_prompts FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own custom prompts" 
  ON custom_prompts FOR DELETE 
  USING (user_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE custom_prompts IS 'User-created custom practice prompts';
COMMENT ON COLUMN custom_prompts.title IS 'User-friendly title for the prompt';
COMMENT ON COLUMN custom_prompts.prompt IS 'The actual prompt text';
COMMENT ON COLUMN custom_prompts.duration_seconds IS 'Target duration for this prompt';
COMMENT ON COLUMN custom_prompts.times_practiced IS 'Counter for how many times practiced';

-- Create function to increment practice count
CREATE OR REPLACE FUNCTION increment_prompt_practice_count(prompt_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE custom_prompts 
  SET times_practiced = times_practiced + 1,
      updated_at = NOW()
  WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_prompt_practice_count TO authenticated;

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE '✅ Created custom_prompts table with RLS';
  RAISE NOTICE '  - Users can save and manage their own prompts';
  RAISE NOTICE '  - Includes practice counter and timestamps';
  RAISE NOTICE '  - Full RLS protection enabled';
END $$;

COMMIT;