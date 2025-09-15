-- Migration: 2025-09-08__question_types_and_timing.sql
-- Purpose: Standardize question types, add timing columns, and seed sample questions

BEGIN;

-- 1) Update question_types to canonical IDs and labels
-- First, clear out old types (but preserve any questions by updating their types)
UPDATE questions 
SET type = CASE 
    WHEN type IN ('listen_then_speak', 'listen and speak') THEN 'listen_then_speak'
    WHEN type IN ('describe_image', 'speak_about_photo') THEN 'speak_about_photo'
    WHEN type IN ('read_aloud', 'read_then_speak') THEN 'read_then_speak'
    WHEN type IN ('answer_question', 'speak_on_topic', 'custom_prompt') THEN 'custom_prompt'
    ELSE type
END;

-- Clear existing question_types
DELETE FROM question_types;

-- Check if we need to modify the table structure
DO $$
BEGIN
    -- Check if 'name' column exists (from RESET_AND_SETUP.sql)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'question_types' AND column_name = 'name') THEN
        -- Working with the original structure from RESET_AND_SETUP
        -- Just insert using the existing columns
        INSERT INTO question_types (name, description) VALUES
            ('listen_then_speak', 'Listen to audio and repeat what you hear'),
            ('speak_about_photo', 'Describe what you see in the image'),
            ('read_then_speak', 'Read the text aloud'),
            ('custom_prompt', 'Respond to a custom prompt')
        ON CONFLICT (name) DO UPDATE 
        SET description = EXCLUDED.description;
    ELSE
        -- Table might have been modified already, use id/label structure
        -- Add columns if they don't exist
        ALTER TABLE question_types ADD COLUMN IF NOT EXISTS id TEXT;
        ALTER TABLE question_types ADD COLUMN IF NOT EXISTS label TEXT;
        
        -- Insert with new structure
        INSERT INTO question_types (id, label, description) VALUES
            ('listen_then_speak', 'Listen, Then Speak', 'Listen to audio and repeat what you hear'),
            ('speak_about_photo', 'Speak About the Photo', 'Describe what you see in the image'),
            ('read_then_speak', 'Read, Then Speak', 'Read the text aloud'),
            ('custom_prompt', 'Custom Prompt', 'Respond to a custom prompt');
    END IF;
END $$;

-- 2) Add timing and metadata columns to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS prep_seconds INTEGER NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS min_seconds INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS max_seconds INTEGER NOT NULL DEFAULT 90,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add constraint to ensure image_url is only used for speak_about_photo
ALTER TABLE questions DROP CONSTRAINT IF EXISTS check_image_url_type;
ALTER TABLE questions ADD CONSTRAINT check_image_url_type 
CHECK (
    (type = 'speak_about_photo' AND image_url IS NOT NULL) OR
    (type != 'speak_about_photo' AND image_url IS NULL) OR
    image_url IS NULL
);

-- 3) Add attempt metadata columns
ALTER TABLE attempts
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS prompt_text TEXT,
ADD COLUMN IF NOT EXISTS type_id TEXT;

-- Update existing attempts to have type_id based on their question
UPDATE attempts a
SET type_id = q.type
FROM questions q
WHERE a.question_id = q.id
AND a.type_id IS NULL;

-- Don't make type_id NOT NULL or add foreign key yet, as question_types might use 'name' column
-- This will be handled in a future migration if needed

-- 4) RLS policies remain unchanged - keeping existing user-owned policies
-- No changes to RLS policies as requested

-- 5) Seed sample questions for each non-custom type

-- Clear existing sample questions to avoid duplicates
DELETE FROM questions WHERE prompt LIKE 'SAMPLE:%' OR metadata->>'is_sample' = 'true';

-- Listen, Then Speak samples (all in English with consistent timing)
INSERT INTO questions (
    type, 
    prompt, 
    target_language, 
    source_language, 
    difficulty,
    prep_seconds,
    min_seconds,
    max_seconds,
    metadata
) VALUES
    ('listen_then_speak', 
     'Hello, how are you doing today?', 
     'English', 'English', 1,
     20, 30, 90,
     '{"is_sample": true, "audio_text": "Hello, how are you doing today?"}'::jsonb),
    
    ('listen_then_speak',
     'I would like to make a reservation for two people, please.',
     'English', 'English', 2,
     20, 30, 90,
     '{"is_sample": true, "audio_text": "I would like to make a reservation for two people, please."}'::jsonb),
    
    ('listen_then_speak',
     'The weather is beautiful today, perfect for a walk in the park.',
     'English', 'English', 1,
     20, 30, 90,
     '{"is_sample": true, "audio_text": "The weather is beautiful today, perfect for a walk in the park."}'::jsonb),
    
    ('listen_then_speak',
     'Can you tell me where the nearest coffee shop is located?',
     'English', 'English', 1,
     20, 30, 90,
     '{"is_sample": true, "audio_text": "Can you tell me where the nearest coffee shop is located?"}'::jsonb);

-- Speak About the Photo samples
INSERT INTO questions (
    type,
    prompt,
    target_language,
    source_language,
    difficulty,
    prep_seconds,
    min_seconds,
    max_seconds,
    image_url,
    metadata
) VALUES
    ('speak_about_photo',
     'Describe what you see in this image. Talk about the people, their activities, and the setting.',
     'English', 'English', 2,
     20, 30, 60,
     'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800',
     '{"is_sample": true, "image_description": "Students studying in a library"}'::jsonb),
    
    ('speak_about_photo',
     'What is happening in this picture? Describe the scene in detail.',
     'English', 'English', 1,
     20, 30, 90,
     'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
     '{"is_sample": true, "image_description": "Person doing yoga at sunrise"}'::jsonb),
    
    ('speak_about_photo',
     'Describe this outdoor scene. What can you see in the foreground and background?',
     'English', 'English', 2,
     20, 30, 60,
     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
     '{"is_sample": true, "image_description": "Mountain landscape with lake"}'::jsonb),
    
    ('speak_about_photo',
     'Talk about this food image. What dishes can you see? How would you describe them?',
     'English', 'English', 1,
     20, 30, 90,
     'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
     '{"is_sample": true, "image_description": "Healthy food bowl with vegetables"}'::jsonb),
    
    ('speak_about_photo',
     'Describe this urban scene. What details do you notice?',
     'English', 'English', 3,
     20, 30, 90,
     'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800',
     '{"is_sample": true, "image_description": "City street with buildings and people"}'::jsonb);

-- Read, Then Speak samples
INSERT INTO questions (
    type,
    prompt,
    target_language,
    source_language,
    difficulty,
    prep_seconds,
    min_seconds,
    max_seconds,
    metadata
) VALUES
    ('read_then_speak',
     'The early bird catches the worm, but the second mouse gets the cheese.',
     'English', 'English', 2,
     20, 30, 90,
     '{"is_sample": true, "pronunciation_focus": "rhythm and intonation"}'::jsonb),
    
    ('read_then_speak',
     'Technology has revolutionized the way we communicate, learn, and work in the modern world.',
     'English', 'English', 2,
     20, 30, 90,
     '{"is_sample": true, "pronunciation_focus": "multisyllabic words"}'::jsonb),
    
    ('read_then_speak',
     'In spring, the cherry blossoms bloom, painting the landscape in delicate shades of pink and white.',
     'English', 'English', 3,
     20, 30, 90,
     '{"is_sample": true, "pronunciation_focus": "descriptive language"}'::jsonb),
    
    ('read_then_speak',
     'Success is not final, failure is not fatal: it is the courage to continue that counts.',
     'English', 'English', 2,
     20, 30, 90,
     '{"is_sample": true, "pronunciation_focus": "emphasis and pauses"}'::jsonb),
    
    ('read_then_speak',
     'The journey of a thousand miles begins with a single step.',
     'English', 'English', 2,
     20, 30, 90,
     '{"is_sample": true, "pronunciation_focus": "clear articulation"}'::jsonb),
    
    ('read_then_speak',
     'Practice makes perfect, but perfection is not always necessary.',
     'English', 'English', 2,
     20, 30, 90,
     '{"is_sample": true, "pronunciation_focus": "consonant clusters"}'::jsonb);

-- Update existing questions to have proper timing values (20s prep, 30s min, 90s max for all non-custom types)
UPDATE questions 
SET 
    prep_seconds = 20,
    min_seconds = 30,
    max_seconds = 90
WHERE type != 'custom_prompt';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_questions_type_difficulty ON questions(type, difficulty);
CREATE INDEX IF NOT EXISTS idx_attempts_type_id ON attempts(type_id);
CREATE INDEX IF NOT EXISTS idx_attempts_created_at ON attempts(attempted_at);

-- Add helpful comments
COMMENT ON COLUMN questions.prep_seconds IS 'Preparation time before recording starts';
COMMENT ON COLUMN questions.min_seconds IS 'Minimum recommended speaking duration';
COMMENT ON COLUMN questions.max_seconds IS 'Maximum allowed speaking duration';
COMMENT ON COLUMN questions.image_url IS 'Image URL for speak_about_photo questions only';
COMMENT ON COLUMN attempts.audio_url IS 'URL to the recorded audio response';
COMMENT ON COLUMN attempts.prompt_text IS 'Exact prompt shown to the user';
COMMENT ON COLUMN attempts.type_id IS 'Reference to the question type';

-- Verify the migration
DO $$
DECLARE
    v_question_count INTEGER;
    v_type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_type_count FROM question_types;
    SELECT COUNT(*) INTO v_question_count FROM questions WHERE metadata->>'is_sample' = 'true';
    
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '  - Question types standardized: % types', v_type_count;
    RAISE NOTICE '  - Sample questions added: % questions', v_question_count;
    RAISE NOTICE '  - Timing columns added to questions table';
    RAISE NOTICE '  - Metadata columns added to attempts table';
    RAISE NOTICE '  - All constraints and indexes created';
END $$;

COMMIT;