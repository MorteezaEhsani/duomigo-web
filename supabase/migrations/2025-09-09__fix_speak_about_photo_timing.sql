-- Fix timing for ALL question types (except custom_prompt)
-- All should have: prep_seconds = 20, min_seconds = 30, max_seconds = 90
UPDATE questions
SET 
    prep_seconds = 20,
    min_seconds = 30,
    max_seconds = 90
WHERE type IN ('listen_then_speak', 'speak_about_photo', 'read_then_speak', 'read_aloud', 'describe_image', 'answer_question', 'speak_on_topic');

-- Verify the update
DO $$
DECLARE
    v_updated_count INTEGER;
    v_check_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_updated_count 
    FROM questions 
    WHERE type != 'custom_prompt' 
    AND prep_seconds = 20 
    AND min_seconds = 30 
    AND max_seconds = 90;
    
    SELECT COUNT(*) INTO v_check_count
    FROM questions
    WHERE type != 'custom_prompt';
    
    RAISE NOTICE '✅ Updated timing for % questions (out of % non-custom questions)', v_updated_count, v_check_count;
    RAISE NOTICE '   All non-custom questions now have: 20s prep, 30s min, 90s max';
END $$;