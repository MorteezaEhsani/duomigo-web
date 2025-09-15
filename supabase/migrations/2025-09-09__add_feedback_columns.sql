-- Migration: 2025-09-09__add_feedback_columns.sql
-- Purpose: Add feedback and scoring columns to attempts table

BEGIN;

-- Add scoring columns if they don't exist
ALTER TABLE attempts 
ADD COLUMN IF NOT EXISTS overall_score DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS fluency_score DECIMAL(3, 1) CHECK (fluency_score >= 0 AND fluency_score <= 5),
ADD COLUMN IF NOT EXISTS pronunciation_score DECIMAL(3, 1) CHECK (pronunciation_score >= 0 AND pronunciation_score <= 5),
ADD COLUMN IF NOT EXISTS grammar_score DECIMAL(3, 1) CHECK (grammar_score >= 0 AND grammar_score <= 5),
ADD COLUMN IF NOT EXISTS vocabulary_score DECIMAL(3, 1) CHECK (vocabulary_score >= 0 AND vocabulary_score <= 5),
ADD COLUMN IF NOT EXISTS coherence_score DECIMAL(3, 1) CHECK (coherence_score >= 0 AND coherence_score <= 5),
ADD COLUMN IF NOT EXISTS feedback_json JSONB,
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_attempts_overall_score ON attempts(overall_score);
CREATE INDEX IF NOT EXISTS idx_attempts_graded_at ON attempts(graded_at);

-- Add comments for documentation
COMMENT ON COLUMN attempts.overall_score IS 'Overall score 0-100';
COMMENT ON COLUMN attempts.fluency_score IS 'Fluency score 0-5 (speed, flow, pauses)';
COMMENT ON COLUMN attempts.pronunciation_score IS 'Pronunciation score 0-5 (intelligibility, stress)';
COMMENT ON COLUMN attempts.grammar_score IS 'Grammar score 0-5 (accuracy, variety)';
COMMENT ON COLUMN attempts.vocabulary_score IS 'Vocabulary score 0-5 (range, appropriacy)';
COMMENT ON COLUMN attempts.coherence_score IS 'Coherence score 0-5 (organization, relevance)';
COMMENT ON COLUMN attempts.feedback_json IS 'Structured feedback with strengths, improvements, tips';
COMMENT ON COLUMN attempts.graded_at IS 'Timestamp when grading was completed';

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE '✅ Added feedback columns to attempts table';
  RAISE NOTICE '  - Scoring columns: overall, fluency, pronunciation, grammar, vocabulary, coherence';
  RAISE NOTICE '  - feedback_json for structured feedback';
  RAISE NOTICE '  - graded_at timestamp';
END $$;

COMMIT;