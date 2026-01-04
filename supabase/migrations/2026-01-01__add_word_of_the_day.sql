-- Word of the Day table
-- Stores daily vocabulary words for premium users

CREATE TABLE IF NOT EXISTS word_of_the_day (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  word TEXT NOT NULL,
  part_of_speech TEXT NOT NULL,
  definition TEXT NOT NULL,
  example TEXT NOT NULL,
  pronunciation TEXT,
  cefr_level TEXT NOT NULL DEFAULT 'B1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one word per user per day
  UNIQUE(user_id, date)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_word_of_the_day_user_date
ON word_of_the_day(user_id, date DESC);

-- RLS policies
ALTER TABLE word_of_the_day ENABLE ROW LEVEL SECURITY;

-- Service role full access (matching existing pattern)
DROP POLICY IF EXISTS "Service role full access to word_of_the_day" ON word_of_the_day;
CREATE POLICY "Service role full access to word_of_the_day" ON word_of_the_day
  FOR ALL USING (true);
