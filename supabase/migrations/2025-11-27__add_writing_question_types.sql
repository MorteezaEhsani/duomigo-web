-- Migration: Add writing question types and update image constraint
-- Date: 2025-11-27

BEGIN;

-- Drop the old constraint that only allows images for speak_about_photo
ALTER TABLE questions DROP CONSTRAINT IF EXISTS check_image_url_type;

-- Add new constraint that allows images for both speak_about_photo and write_about_photo
ALTER TABLE questions ADD CONSTRAINT check_image_url_type
CHECK (
    (type = 'speak_about_photo' AND image_url IS NOT NULL) OR
    (type = 'write_about_photo' AND image_url IS NOT NULL) OR
    (type NOT IN ('speak_about_photo', 'write_about_photo') AND image_url IS NULL) OR
    image_url IS NULL
);

COMMENT ON CONSTRAINT check_image_url_type ON questions IS 'Ensures image_url is required for photo-based questions and null for others';

COMMIT;
