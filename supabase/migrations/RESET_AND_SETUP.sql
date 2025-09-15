-- COMPLETE RESET AND SETUP
-- This script will drop all existing tables and recreate them properly

-- STEP 1: Drop all existing tables and functions
DROP TABLE IF EXISTS attempts CASCADE;
DROP TABLE IF EXISTS practice_sessions CASCADE;
DROP TABLE IF EXISTS daily_activity CASCADE;
DROP TABLE IF EXISTS streaks CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS question_types CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS get_or_create_user_by_clerk_id CASCADE;
DROP FUNCTION IF EXISTS upsert_daily_activity_tz_clerk CASCADE;
DROP FUNCTION IF EXISTS upsert_daily_activity_tz CASCADE;

-- STEP 2: Create profiles table
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE,
  email TEXT,
  display_name TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_clerk_user_id ON profiles(clerk_user_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- STEP 3: Create question_types table
CREATE TABLE question_types (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 4: Create questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  target_language TEXT NOT NULL,
  source_language TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);

-- STEP 5: Create practice_sessions table
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);

-- STEP 6: Create attempts table WITH session_id
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  transcript TEXT,
  score DECIMAL(5, 2),
  feedback TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attempts_session_id ON attempts(session_id);
CREATE INDEX idx_attempts_user_id ON attempts(user_id);
CREATE INDEX idx_attempts_question_id ON attempts(question_id);

-- STEP 7: Create daily_activity table
CREATE TABLE daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  minutes_practiced INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, activity_date)
);

CREATE INDEX idx_daily_activity_user_date ON daily_activity(user_id, activity_date);

-- STEP 8: Create streaks table
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_activity_date DATE
);

CREATE INDEX idx_streaks_user_id ON streaks(user_id);

-- STEP 9: Insert question types
INSERT INTO question_types (name, description) VALUES
  ('listen_then_speak', 'Listen Then Speak'),
  ('read_aloud', 'Read Aloud'),
  ('describe_image', 'Describe Image'),
  ('answer_question', 'Answer Question'),
  ('speak_on_topic', 'Speak On Topic');

-- STEP 10: Insert sample questions
INSERT INTO questions (type, prompt, target_language, source_language, difficulty, metadata) VALUES
  ('listen_then_speak', 'Listen to the audio and repeat: "Buenos días, ¿cómo está usted?"', 'Spanish', 'English', 1, '{"audio_url": "placeholder_audio_1.mp3"}'),
  ('listen_then_speak', 'Listen and repeat: "Je voudrais un café, s''il vous plaît"', 'French', 'English', 1, '{"audio_url": "placeholder_audio_2.mp3"}'),
  ('read_aloud', 'Read this sentence aloud: "The quick brown fox jumps over the lazy dog"', 'English', 'English', 1, '{"expected_duration": 5}'),
  ('read_aloud', 'Read aloud: "Ich möchte gerne ein Glas Wasser bestellen"', 'German', 'English', 2, '{"expected_duration": 6}'),
  ('describe_image', 'Describe what you see in this image of a busy marketplace', 'English', 'English', 2, '{"image_url": "placeholder_market.jpg", "min_duration": 15}'),
  ('describe_image', 'Describe this picture of a family having dinner', 'Spanish', 'English', 2, '{"image_url": "placeholder_dinner.jpg", "min_duration": 15}'),
  ('answer_question', 'What is your favorite food and why do you like it?', 'English', 'English', 1, '{"expected_duration": 10}'),
  ('answer_question', '¿Cuál es tu pasatiempo favorito?', 'Spanish', 'Spanish', 2, '{"expected_duration": 10}'),
  ('speak_on_topic', 'Talk about your daily routine for 30 seconds', 'English', 'English', 2, '{"min_duration": 25, "max_duration": 35}'),
  ('speak_on_topic', 'Describe your hometown and what makes it special', 'English', 'English', 3, '{"min_duration": 30, "max_duration": 45}');

-- STEP 11: Create Clerk user mapping function
CREATE FUNCTION get_or_create_user_by_clerk_id(
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
    timezone
  ) VALUES (
    v_user_id,
    p_clerk_user_id,
    p_email,
    COALESCE(p_display_name, split_part(p_email, '@', 1), 'User'),
    'America/Los_Angeles'
  )
  ON CONFLICT (clerk_user_id) DO UPDATE
    SET email = COALESCE(profiles.email, EXCLUDED.email),
        display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
        updated_at = NOW()
  RETURNING user_id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

-- STEP 12: Create activity tracking function
CREATE FUNCTION upsert_daily_activity_tz_clerk(
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
  -- Get user's timezone
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

  -- Update or create streak
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

-- STEP 13: Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_user_by_clerk_id TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_user_by_clerk_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user_by_clerk_id TO service_role;

GRANT EXECUTE ON FUNCTION upsert_daily_activity_tz_clerk TO anon;
GRANT EXECUTE ON FUNCTION upsert_daily_activity_tz_clerk TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_daily_activity_tz_clerk TO service_role;

-- STEP 14: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- STEP 15: Create permissive policies for now (using Clerk for auth)
CREATE POLICY "Allow all for profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow select for questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Allow all for practice_sessions" ON practice_sessions FOR ALL USING (true);
CREATE POLICY "Allow all for attempts" ON attempts FOR ALL USING (true);
CREATE POLICY "Allow all for daily_activity" ON daily_activity FOR ALL USING (true);
CREATE POLICY "Allow all for streaks" ON streaks FOR ALL USING (true);

-- STEP 16: Verify everything was created
DO $$
BEGIN
  RAISE NOTICE '✅ SUCCESS! Database has been completely reset and set up.';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - profiles (with clerk_user_id)';
  RAISE NOTICE '  - questions (10 sample questions)';
  RAISE NOTICE '  - practice_sessions';
  RAISE NOTICE '  - attempts (with session_id column)';
  RAISE NOTICE '  - daily_activity';
  RAISE NOTICE '  - streaks';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - get_or_create_user_by_clerk_id';
  RAISE NOTICE '  - upsert_daily_activity_tz_clerk';
  RAISE NOTICE '';
  RAISE NOTICE 'Your app should now work! Refresh the /app page.';
END $$;